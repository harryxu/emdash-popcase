export function normalizeOptions(options = {}) {
  return {
    collections: Array.isArray(options.collections)
      ? options.collections.filter((value) => typeof value === "string")
      : ["posts", "pages"],
    zoom: options.zoom !== false,
    counter: options.counter !== false,
    captions: options.captions !== false,
    labels: Object.fromEntries(Object.entries(options.labels ?? {})
      .filter(([, value]) => typeof value === "string")),
  };
}

const chinese = {
  "Open image": "放大查看图片",
  "Close": "关闭",
  "Next": "下一张",
  "Previous": "上一张",
  "Zoom in": "放大",
  "Zoom out": "缩小",
  "Loading...": "加载中…",
  "Error loading image": "图片加载失败",
  "Image": "图片",
  "Lightbox": "图片查看器",
  "Photo gallery": "图片浏览",
  "Slide": "图片",
  "Carousel": "图片浏览",
  "{index} of {total}": "第 {index} 张，共 {total} 张",
  "Caption": "图片说明",
  "of": "/",
};

export function resolveLabels(language = "en", overrides = {}) {
  return { ...(language.toLowerCase().startsWith("zh") ? chinese : {}), ...overrides };
}
