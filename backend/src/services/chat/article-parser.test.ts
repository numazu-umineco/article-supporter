import { describe, it, expect } from 'vitest'
import { parseArticle, stripArticle } from './article-parser'

describe('parseArticle', () => {
  it('articleタグがない場合はnullを返す', () => {
    const text = 'こんにちは、記事を作成しましょう。'
    const result = parseArticle(text)

    expect(result.article).toBeNull()
    expect(result.displayText).toBe(text)
  })

  it('articleタグからtitle, slug, contentを抽出する', () => {
    const text = `記事を作成しました。

<article>
<title>うみねこカフェ 第7回</title>
<slug>umineco_cafe_7th</slug>
<content>
# うみねこカフェ 第7回

2025年1月15日に開催しました。
</content>
</article>`

    const result = parseArticle(text)

    expect(result.article).not.toBeNull()
    expect(result.article!.title).toBe('うみねこカフェ 第7回')
    expect(result.article!.slug).toBe('umineco_cafe_7th')
    expect(result.article!.content).toBe(
      '# うみねこカフェ 第7回\n\n2025年1月15日に開催しました。'
    )
    expect(result.displayText).toBe('記事を作成しました。')
  })

  it('articleタグの前後のテキストをdisplayTextとして返す', () => {
    const text = `前のテキスト

<article>
<title>テスト</title>
</article>

後のテキスト`

    const result = parseArticle(text)

    expect(result.displayText).toBe('前のテキスト\n\n\n\n後のテキスト')
  })

  it('一部のフィールドだけのarticleタグを処理する', () => {
    const text = `<article>
<title>タイトルのみ</title>
</article>`

    const result = parseArticle(text)

    expect(result.article).not.toBeNull()
    expect(result.article!.title).toBe('タイトルのみ')
    expect(result.article!.slug).toBeUndefined()
    expect(result.article!.content).toBeUndefined()
  })

  it('contentにMarkdownの複雑な記法を含む場合', () => {
    const text = `<article>
<title>複雑な記事</title>
<slug>complex-article</slug>
<content>
## 見出し

- リスト1
- リスト2

![画像](./photo.jpg)

> 引用テキスト

\`\`\`javascript
console.log('hello')
\`\`\`
</content>
</article>`

    const result = parseArticle(text)

    expect(result.article!.content).toContain('## 見出し')
    expect(result.article!.content).toContain('![画像](./photo.jpg)')
    expect(result.article!.content).toContain('> 引用テキスト')
    expect(result.article!.content).toContain("console.log('hello')")
  })

  it('空のarticleタグの場合', () => {
    const text = '<article></article>'
    const result = parseArticle(text)

    expect(result.article).not.toBeNull()
    expect(result.article!.title).toBeUndefined()
    expect(result.article!.slug).toBeUndefined()
    expect(result.article!.content).toBeUndefined()
    expect(result.displayText).toBe('')
  })
})

describe('stripArticle', () => {
  it('articleタグを除去してテキストを返す', () => {
    const text = `通常のテキスト

<article>
<title>タイトル</title>
<content>本文</content>
</article>

追加テキスト`

    const result = stripArticle(text)
    expect(result).toBe('通常のテキスト\n\n\n\n追加テキスト')
  })

  it('articleタグがない場合はそのまま返す', () => {
    const text = '通常のテキストのみ'
    const result = stripArticle(text)
    expect(result).toBe('通常のテキストのみ')
  })

  it('前後の空白をtrimする', () => {
    const text = '  テキスト  <article><title>t</title></article>  '
    const result = stripArticle(text)
    expect(result).toBe('テキスト')
  })
})
