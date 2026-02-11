<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = withDefaults(defineProps<{
  content: string
  baseUrl?: string
  imageResolver?: (src: string) => string
}>(), {
  baseUrl: undefined,
  imageResolver: undefined,
})

const md = computed(() => {
  const instance = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  })

  const { imageResolver, baseUrl } = props

  // Override image rendering to apply imageResolver
  if (imageResolver) {
    const defaultImageRender = instance.renderer.rules.image ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options)
      }

    instance.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      const src = token.attrGet('src')
      if (src) {
        token.attrSet('src', imageResolver(src))
      }
      return defaultImageRender(tokens, idx, options, env, self)
    }
  }

  // Override link rendering to add target="_blank" and resolve relative URLs
  const defaultLinkOpen = instance.renderer.rules.link_open ||
    function (tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  instance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    if (baseUrl) {
      const href = token.attrGet('href')
      if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')) {
        try {
          token.attrSet('href', new URL(href, baseUrl).toString())
        } catch {
          // If URL construction fails, leave href as-is
        }
      }
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  return instance
})

const renderedHtml = computed(() => {
  return md.value.render(props.content || '')
})
</script>

<template>
  <div class="markdown-preview" v-html="renderedHtml" />
</template>

<style scoped>
.markdown-preview {
  overflow-y: auto;
  line-height: 1.7;
}

.markdown-preview :deep(h1) { font-size: 1.5rem; margin: 1rem 0 0.5rem; font-weight: bold; }
.markdown-preview :deep(h2) { font-size: 1.3rem; margin: 1rem 0 0.5rem; font-weight: bold; }
.markdown-preview :deep(h3) { font-size: 1.15rem; margin: 0.8rem 0 0.4rem; font-weight: bold; }

.markdown-preview :deep(p) { margin: 0.5rem 0; }

.markdown-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.markdown-preview :deep(a) {
  color: var(--p-primary-color);
  text-decoration: underline;
}

.markdown-preview :deep(blockquote) {
  border-left: 3px solid var(--p-surface-400);
  margin: 0.5rem 0;
  padding: 0.25rem 1rem;
  color: var(--p-text-muted-color);
}

.markdown-preview :deep(code) {
  background: var(--p-surface-100);
  padding: 0.15rem 0.3rem;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-preview :deep(pre) {
  background: var(--p-surface-100);
  padding: 0.75rem;
  border-radius: 4px;
  overflow-x: auto;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 1.5rem;
}

.markdown-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--p-surface-300);
  margin: 1rem 0;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid var(--p-surface-300);
  padding: 0.4rem 0.75rem;
  text-align: left;
}

.markdown-preview :deep(th) {
  background: var(--p-surface-100);
  font-weight: bold;
}
</style>
