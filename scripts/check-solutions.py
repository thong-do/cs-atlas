#!/usr/bin/env python3
"""Usage: python3 scripts/check-solutions.py .velite/solutions.json

Runs every approach's Python block (Brute force, Better, Optimal) of every solution against its cases.
Each case runs in a forked child with a 2 s timeout. Brute force skips the `large` case.

Harnesses:
  function  Solution().<entry>(*args); `args` types convert inputs, `returns` converts the output
            (plain | listnode | treenode | inplace:<i>, which compares args[i] after the call).
  class     ops[0] constructs <entry>(*args[0]) (expect null), later ops call methods; compares the output list.
  custom    `check` is exec'd in the approach's namespace and must define run(Solution, case), which asserts.
"""
import bisect
import collections
import copy
import functools
import heapq
import itertools
import json
import math
import multiprocessing
import sys

TIMEOUT = 2
APPROACHES = ('Brute force', 'Better', 'Optimal')
CTX = multiprocessing.get_context('fork')


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def prelude():
    ns = {'__name__': 'solution', 'ListNode': ListNode, 'TreeNode': TreeNode, 'collections': collections, 'heapq': heapq,
          'math': math, 'functools': functools, 'itertools': itertools, 'bisect': bisect}
    exec('from typing import *', ns)
    return ns


def to_list_node(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head


def from_list_node(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out


def to_tree_node(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0])
    queue, i = collections.deque([root]), 1
    while queue and i < len(vals):
        node = queue.popleft()
        for side in ('left', 'right'):
            if i < len(vals) and vals[i] is not None:
                child = TreeNode(vals[i])
                setattr(node, side, child)
                queue.append(child)
            i += 1
    return root


def from_tree_node(root):
    out, queue = [], collections.deque([root])
    while queue:
        node = queue.popleft()
        out.append(node.val if node else None)
        if node:
            queue.extend((node.left, node.right))
    while out and out[-1] is None:
        out.pop()
    return out


TO = {'plain': lambda v: v, 'listnode': to_list_node, 'treenode': to_tree_node}
FROM = {'plain': lambda v: v, 'listnode': from_list_node, 'treenode': from_tree_node}


def norm(v):
    if isinstance(v, (list, tuple)):
        return [norm(x) for x in v]
    return v


def key(v):
    return json.dumps(v, sort_keys=True, default=repr)


def same(actual, expect, compare):
    a, e = norm(actual), norm(expect)
    if compare == 'float':
        if isinstance(a, list) and isinstance(e, list):
            return len(a) == len(e) and all(same(x, y, 'float') for x, y in zip(a, e))
        if isinstance(a, (int, float)) and isinstance(e, (int, float)) and not isinstance(a, bool):
            return abs(a - e) <= 1e-5
        return a == e
    if compare in ('unordered', 'unordered-deep') and isinstance(a, list) and isinstance(e, list):
        if compare == 'unordered-deep':
            a = [sorted(x, key=key) if isinstance(x, list) else x for x in a]
            e = [sorted(x, key=key) if isinstance(x, list) else x for x in e]
        return sorted(a, key=key) == sorted(e, key=key)
    return a == e


def show(v):
    return json.dumps(norm(v), default=repr)


def error(e):
    return (f'{type(e).__name__}: {e}' if str(e) else type(e).__name__).replace('\n', ' ')


def run_case(code, entry, case, conn):
    """Child process: exec the approach, run one case, send back None (pass) or a failure message."""
    try:
        ns = prelude()
        exec(code, ns)
        harness = entry.get('harness', 'function')
        compare = entry.get('compare', 'exact')
        if harness == 'custom':
            exec(entry['check'], ns)
            ns['run'](ns.get('Solution'), case)
            conn.send(None)
            return
        if harness == 'class':
            ops, args = case['ops'], case['args']
            obj = ns[entry['entry']](*args[0])
            actual = [None] + [getattr(obj, op)(*a) for op, a in zip(ops[1:], args[1:])]
        else:
            types = entry.get('args') or []
            raw = case['args']
            args = [TO[types[i] if i < len(types) else 'plain'](a) for i, a in enumerate(raw)]
            result = getattr(ns['Solution'](), entry['entry'])(*args)
            ret = entry.get('returns', 'plain')
            if ret.startswith('inplace:'):
                i = int(ret.split(':')[1])
                actual = FROM[types[i] if i < len(types) else 'plain'](args[i])
            else:
                actual = FROM[ret](result)
        conn.send(None if same(actual, case['expect'], compare) else f"expected {show(case['expect'])}, got {show(actual)}")
    except BaseException as e:
        conn.send(error(e))


def run(code, entry, case):
    recv, send = CTX.Pipe(duplex=False)
    p = CTX.Process(target=run_case, args=(code, entry, copy.deepcopy(case), send))
    p.start()
    send.close()
    try:
        if not recv.poll(TIMEOUT):
            return f'timed out after {TIMEOUT}s'
        return recv.recv()
    except EOFError:
        p.join()
        return f'crashed (exit code {p.exitcode})'
    finally:
        if p.is_alive():
            p.kill()
        p.join()
        recv.close()


def sections(raw):
    """Map each `## ` heading to its body, ignoring headings inside code fences."""
    out, title, fence = {}, None, False
    for line in raw.splitlines():
        if line.lstrip().startswith('```'):
            fence = not fence
        if not fence and line.startswith('## '):
            title = line[3:].strip()
            out[title] = []
        elif title is not None:
            out[title].append(line)
    return out


def python_blocks(lines):
    blocks, cur, lang = [], None, None
    for line in lines:
        s = line.strip()
        if cur is None:
            if s.startswith('```'):
                cur, lang = [], (s[3:].split() or [''])[0]
        elif s == '```':
            if lang == 'python':
                blocks.append('\n'.join(cur))
            cur = None
        else:
            cur.append(line)
    return blocks


def approaches(entry):
    secs = sections(entry['raw'])
    return [(t, python_blocks(secs[t])) for t in APPROACHES if t in secs]


def check_entry(entry):
    path, fails = entry['path'], []
    found = approaches(entry)
    if not found:
        return [f'FAIL {path}: no approach sections']
    large = None
    if entry.get('large'):
        try:
            large = {'args': eval(entry['large']['args'], prelude()), 'expect': entry['large']['expect']}
        except Exception as e:
            fails.append(f'FAIL {path} [large]: {error(e)}')
    for title, blocks in found:
        if len(blocks) != 1:
            fails.append(f'FAIL {path} [{title}]: expected one python block, found {len(blocks)}')
            continue
        try:
            code = compile(blocks[0], title, 'exec')
        except SyntaxError as e:
            fails.append(f'FAIL {path} [{title}]: {error(e)}')
            continue
        cases = list(enumerate(entry['cases'], 1))
        if large and title != 'Brute force':
            cases.append(('large', large))
        for n, case in cases:
            err = run(code, entry, case)
            if err is not None:
                fails.append(f'FAIL {path} [{title}] case {n}: {err}')
    return fails


def main(argv):
    if len(argv) != 1:
        print('Usage: python3 scripts/check-solutions.py <solutions.json>', file=sys.stderr)
        return 2
    with open(argv[0]) as f:
        entries = json.load(f)
    fails = [line for e in entries for line in check_entry(e)]
    for line in fails:
        print(line)
    if fails:
        return 1
    print(f'OK {len(entries)} solutions, {sum(len(approaches(e)) for e in entries)} approaches')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
