export const trackHref = (track: string) => `/${track}/`
export const lessonHref = (lesson: { track: string; slug: string }) => `/${lesson.track}/${lesson.slug}/`
export const exerciseHref = (slug: string) => `/exercises/${slug}/`
