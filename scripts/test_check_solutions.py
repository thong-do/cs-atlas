import contextlib
import importlib.util
import io
import json
import tempfile
import time
import unittest
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('check_solutions', HERE / 'check-solutions.py')
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)
FIXTURES = HERE / 'check-solutions-fixtures'


def body(**approaches):
    """Build an MDX body; keys brute/better/optimal map to Python source."""
    names = {'brute': 'Brute force', 'better': 'Better', 'optimal': 'Optimal'}
    parts = ['## Intuition\n\nSome words.\n']
    for key, title in names.items():
        if key in approaches:
            parts.append(f'## {title}\n\n1. Step.\n\n```python\n{approaches[key].strip()}\n```\n\n**Complexity:** O(n).\n')
    return '\n'.join(parts)


def entry(raw, **kw):
    return {'problem': 'p', 'path': 'solutions/p', 'harness': 'function', 'raw': raw, **kw}


TWO_SUM_CASES = [
    {'args': [[2, 7, 11, 15], 9], 'expect': [0, 1]},
    {'args': [[3, 2, 4], 6], 'expect': [1, 2]},
    {'args': [[3, 3], 6], 'expect': [0, 1]},
]

TWO_SUM_BRUTE = '''
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
'''

TWO_SUM_OPT = '''
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, x in enumerate(nums):
            if target - x in seen:
                return [seen[target - x], i]
            seen[x] = i
'''


class CheckEntry(unittest.TestCase):
    def test_function_pass(self):
        e = entry(body(brute=TWO_SUM_BRUTE, optimal=TWO_SUM_OPT), entry='twoSum', cases=TWO_SUM_CASES)
        self.assertEqual(cs.check_entry(e), [])

    def test_function_wrong_answer(self):
        bad = 'class Solution:\n    def twoSum(self, nums, target):\n        return [1, 0]'
        e = entry(body(brute=TWO_SUM_BRUTE, optimal=bad), entry='twoSum', compare='exact', cases=TWO_SUM_CASES[:1])
        fails = cs.check_entry(e)
        self.assertEqual(fails, ['FAIL solutions/p [Optimal] case 1: expected [0, 1], got [1, 0]'])

    def _groups(self, compare):
        code = 'class Solution:\n    def f(self):\n        return [[1, 2], [0]]'
        return cs.check_entry(entry(body(optimal=code), entry='f', compare=compare, cases=[{'args': [], 'expect': [[0], [2, 1]]}]))

    def test_unordered(self):
        fails = self._groups('unordered')
        self.assertEqual(len(fails), 1)
        self.assertIn('[Optimal] case 1', fails[0])

    def test_unordered_deep(self):
        self.assertEqual(self._groups('unordered-deep'), [])

    def test_float(self):
        code = 'class Solution:\n    def f(self):\n        return 0.3333334'
        e = entry(body(optimal=code), entry='f', compare='float', cases=[{'args': [], 'expect': 1 / 3}])
        self.assertEqual(cs.check_entry(e), [])

    def test_listnode_and_treenode(self):
        rev = '''
class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev = None
        while head:
            head.next, prev, head = prev, head, head.next
        return prev
'''
        e = entry(body(optimal=rev), entry='reverseList', args=['listnode'], returns='listnode',
                  cases=[{'args': [[1, 2, 3]], 'expect': [3, 2, 1]}, {'args': [[]], 'expect': []}])
        self.assertEqual(cs.check_entry(e), [])
        inv = '''
class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if root:
            root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
'''
        e = entry(body(optimal=inv), entry='invertTree', args=['treenode'], returns='treenode',
                  cases=[{'args': [[4, 2, 7, 1, 3, None, 9]], 'expect': [4, 7, 2, 9, None, 3, 1]},
                         {'args': [[]], 'expect': []}])
        self.assertEqual(cs.check_entry(e), [])

    def test_inplace(self):
        code = '''
class Solution:
    def rotate(self, matrix: List[List[int]]) -> None:
        matrix[:] = [list(r) for r in zip(*matrix[::-1])]
'''
        e = entry(body(optimal=code), entry='rotate', returns='inplace:0',
                  cases=[{'args': [[[1, 2], [3, 4]]], 'expect': [[3, 1], [4, 2]]}])
        self.assertEqual(cs.check_entry(e), [])

    def test_class_harness(self):
        code = '''
class MinStack:
    def __init__(self):
        self.s = []
    def push(self, val: int) -> None:
        self.s.append((val, min(val, self.s[-1][1] if self.s else val)))
    def pop(self) -> None:
        self.s.pop()
    def top(self) -> int:
        return self.s[-1][0]
    def getMin(self) -> int:
        return self.s[-1][1]
'''
        case = {'ops': ['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'],
                'args': [[], [-2], [0], [-3], [], [], [], []],
                'expect': [None, None, None, None, -3, None, 0, -2]}
        e = entry(body(optimal=code), entry='MinStack', harness='class', cases=[case])
        self.assertEqual(cs.check_entry(e), [])
        e['cases'] = [{**case, 'expect': [None, None, None, None, -3, None, 0, -3]}]
        self.assertEqual(len(cs.check_entry(e)), 1)

    def test_custom_harness(self):
        code = 'class Solution:\n    def double(self, x):\n        return x * 2'
        check = 'def run(Solution, case):\n    assert Solution().double(case["x"]) == case["want"], "mismatch"\n'
        e = entry(body(optimal=code), entry='double', harness='custom', check=check,
                  cases=[{'x': 2, 'want': 4}, {'x': 3, 'want': 7}])
        self.assertEqual(cs.check_entry(e), ['FAIL solutions/p [Optimal] case 2: AssertionError: mismatch'])

    def test_args_deep_copied(self):
        brute = 'class Solution:\n    def first(self, nums):\n        x = nums[0]\n        nums.sort()\n        return x'
        opt = 'class Solution:\n    def first(self, nums):\n        return nums[0]'
        cases = [{'args': [[3, 1, 2]], 'expect': 3}]
        e = entry(body(brute=brute, optimal=opt), entry='first', cases=cases)
        self.assertEqual(cs.check_entry(e), [])
        self.assertEqual(cases[0]['args'], [[3, 1, 2]])

    def test_leetcode_names(self):
        code = '''
class Solution:
    def f(self, nums: List[int]) -> Optional[int]:
        q = deque(nums)
        c = Counter(nums)
        d = defaultdict(int)
        h = []
        for x in q:
            heappush(h, x)
            d[x] += 1

        @lru_cache(None)
        def g(n):
            return n
        return [h[0], c[1], d[2], bisect_left(sorted(nums), 2), g(5), pow(2, 10, 1000), math.floor(1.5)]
'''
        e = entry(body(optimal=code), entry='f', cases=[{'args': [[3, 1, 2, 1]], 'expect': [1, 2, 1, 2, 5, 24, 1]}])
        self.assertEqual(cs.check_entry(e), [])

    def test_timeout(self):
        code = 'class Solution:\n    def f(self):\n        while True: pass'
        start = time.monotonic()
        fails = cs.check_entry(entry(body(optimal=code), entry='f', cases=[{'args': [], 'expect': 1}]))
        self.assertLess(time.monotonic() - start, 10)
        self.assertEqual(len(fails), 1)
        self.assertIn('timed out after 2s', fails[0])

    def test_large_skips_brute_force(self):
        brute = '''
class Solution:
    def hasDup(self, nums):
        return any(nums[i] == nums[j] for i in range(len(nums)) for j in range(i + 1, len(nums)))
'''
        opt = 'class Solution:\n    def hasDup(self, nums):\n        return len(set(nums)) < len(nums)'
        e = entry(body(brute=brute, optimal=opt), entry='hasDup',
                  cases=[{'args': [[1, 2, 1]], 'expect': True}, {'args': [[1, 2]], 'expect': False}],
                  large={'args': '[list(range(100000))]', 'expect': False})
        self.assertEqual(cs.check_entry(e), [])
        e['raw'] = body(optimal=brute)
        self.assertIn('[Optimal] case large: timed out after 2s', cs.check_entry(e)[0])

    def test_warns_when_brute_force_passes_large(self):
        brute = 'class Solution:\n    def hasDup(self, nums):\n        return len(set(nums)) < len(nums)'
        e = entry(body(brute=brute, optimal=brute), entry='hasDup',
                  cases=[{'args': [[1, 2, 1]], 'expect': True}, {'args': [[1, 2]], 'expect': False}],
                  large={'args': '[list(range(100000))]', 'expect': False})
        warn = 'WARN solutions/p [Brute force] passes the large case; it does not separate the approaches'
        self.assertEqual(cs.check_entry(e), [warn])
        with tempfile.NamedTemporaryFile('w', suffix='.json') as f:
            json.dump([e], f)
            f.flush()
            with contextlib.redirect_stdout(io.StringIO()) as out:
                self.assertEqual(cs.main([f.name]), 0)
        self.assertEqual(out.getvalue(), f'{warn}\nOK 1 solutions, 2 approaches\n')

    def test_main_exit_codes(self):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(cs.main([str(FIXTURES / 'ok.json')]), 0)
        self.assertRegex(out.getvalue(), r'^OK 2 solutions, 3 approaches\n$')
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(cs.main([str(FIXTURES / 'bad.json')]), 1)
        self.assertIn('FAIL solutions/bad [Optimal] case 1', out.getvalue())

    def test_main_empty(self):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(cs.main([str(FIXTURES / 'empty.json')]), 0)
        self.assertEqual(out.getvalue(), 'OK 0 solutions, 0 approaches\n')


if __name__ == '__main__':
    unittest.main()
