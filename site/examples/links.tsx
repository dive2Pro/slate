// @refresh reset
import React, { useState, useMemo, useEffect } from 'react'
import isUrl from 'is-url'
import { Slate, Editable, withReact, useSlate } from 'slate-react'
import { jsx } from 'slate-hyperscript'
import {
  Node,
  Transforms,
  Editor,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
} from 'slate'
import { withHistory } from 'slate-history'
import { LinkElement, PageRefElement, PageTempRefElement } from './custom-types'

import { Button, Icon, Toolbar } from '../components'
import { css } from 'emotion'

const LinkExample = () => {
  const [value, setValue] = useState<Descendant[]>(initialValue)
  const editor = useMemo(
    () => withLinks(withHistory(withReact(createEditor()))),
    []
  )

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        setValue(value)
        const { selection } = editor
        if (selection && Range.isCollapsed(selection)) {
          if (isRefActive(editor)) {
            console.log(value)
            console.log('ahahaha')
          }
        }
      }}
    >
      <Toolbar>
        <LinkButton />
      </Toolbar>
      <Editable
        renderElement={(props) => <Element {...props} />}
        placeholder="Enter some text..."
      />
    </Slate>
  )
}

const withLinks = (editor: Editor) => {
  const { insertData, insertText, isInline, selection } = editor

  editor.isInline = (element) => {
    return ['link', 'page-ref', 'page-temp-ref'].some(
      (type) => element.type === type
    )
      ? true
      : isInline(element)
  }

  editor.insertText = (text) => {
    if (text && isUrl(text)) {
      return wrapLink(editor, text)
    } else if (text === '[') {
      // 1. 获知当前是否是在[中连续插入 [] ]
      // 先不考虑连续插入的情况, 只考虑是正确输入了两个 [[

      if (isTempRefActive(editor)) {
        wrapRef(editor, '')
      } else {
        wrapTempRef(editor, '')
      }
    } else {
      const isCollapsed = selection && Range.isCollapsed(selection)
      console.log(isCollapsed)
      insertText(text)
    }
  }

  editor.insertData = (data) => {
    const text = data.getData('text/plain')

    if (text && isUrl(text)) {
      wrapLink(editor, text)
    } else {
      insertData(data)
    }
  }

  return editor
}

const insertLink = (editor, url) => {
  if (editor.selection) {
    wrapLink(editor, url)
  }
}

const isLinkActive = (editor) => {
  const [link] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
  return !!link
}

const unwrapLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
  })
}

const isRefActive = (editor: Editor) => {
  const [ref] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'page-ref',
  })
  return !!ref
}

const isTempRefActive = (editor: Editor) => {
  const [ref] = Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === 'page-temp-ref',
  })
  return !!ref
}

const unwrapRef = (editor: Editor) => {
  console.log('unwrap ref')
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'page-ref',
  })
}

const unwrapTempRef = (editor: Editor) => {
  console.log('unwrap ref')
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === 'page-temp-ref',
  })
}
const wrapTempRef = (editor: Editor, text: string) => {
  if (isTempRefActive(editor)) {
    unwrapRef(editor)
  }
  const pageRef: PageTempRefElement = {
    type: 'page-temp-ref',
    title: text,
    children: [{ text: '[]' }],
  }

  Transforms.insertNodes(editor, pageRef)

  Transforms.setSelection(editor, {
    ...editor.selection,
    anchor: {
      ...editor.selection.anchor,
      offset: editor.selection.anchor.offset - 1,
    },
    focus: {
      ...editor.selection.focus,
      offset: editor.selection.focus.offset - 1,
    },
  })
}
const wrapRef = (editor: Editor, text: string) => {
  if (isRefActive(editor)) {
    unwrapRef(editor)
  }

  Transforms.removeNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      n.type === 'page-temp-ref',
    mode: 'lowest',
  })
  console.log(parent, ' =response')
  const pageRef: PageRefElement = {
    type: 'page-ref',
    title: text,
    children: [{ text: '[[]]' }],
  }

  Transforms.insertNodes(editor, pageRef)

  Transforms.setSelection(editor, {
    ...editor.selection,
    anchor: {
      ...editor.selection.anchor,
      offset: editor.selection.anchor.offset - 2,
    },
    focus: {
      ...editor.selection.focus,
      offset: editor.selection.focus.offset - 2,
    },
  })
}

const wrapLink = (editor, url) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor)
  }

  const { selection } = editor
  const isCollapsed = selection && Range.isCollapsed(selection)
  const link: LinkElement = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  }

  if (isCollapsed) {
    Transforms.insertNodes(editor, link)
  } else {
    Transforms.wrapNodes(editor, link, { split: true })
    Transforms.collapse(editor, { edge: 'end' })
  }
}

const deserialize = (el) => {
  if (el.nodeType === 3) {
    return el.textContent
  } else if (el.nodeType !== 1) {
    return null
  }

  const children = Array.from(el.childNodes).map(deserialize)

  if (children.length === 0) {
    children = [{ text: '' }]
  }

  switch (el.nodeName) {
    case 'BODY':
      return jsx('fragment', {}, children)
    case 'BR':
      return '\n'
    case 'BLOCKQUOTE':
      return jsx('element', { type: 'quote' }, children)
    case 'P':
      return jsx('element', { type: 'paragraph' }, children)
    case 'A':
      return jsx(
        'element',
        { type: 'link', url: el.getAttribute('href') },
        children
      )
    default:
      return el.textContent
  }
}

function PageRef(props) {
  const { attributes, children, element } = props
  useEffect(() => {
    console.log(' -----@@', element.children.text)
    // if (children) console.log(Node.string(children), ' = children')
  }, [children])
  return (
    <a
      {...attributes}
      href="www.baidu.com"
      className={css`
        color: #106ba3;
      `}
    >
      {children}
    </a>
  )
}

const Element = (props) => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'page-temp-ref':
      return <span {...attributes}>{children}</span>
    case 'page-ref':
      return <PageRef {...props} />
    case 'link':
      return (
        <a
          {...attributes}
          href={element.url}
          className={css`
            &::before {
              content: '[';
            }

            &::after {
              content: ']';
            }
          `}
        >
          {children}
        </a>
      )
    default:
      return <p {...attributes}>{children}</p>
  }
}

const LinkButton = () => {
  const editor = useSlate()
  return (
    <Button
      active={isLinkActive(editor)}
      onMouseDown={(event) => {
        event.preventDefault()
        const url = window.prompt('Enter the URL of the link:')
        if (!url) return
        insertLink(editor, url)
      }}
    >
      <Icon>link</Icon>
    </Button>
  )
}

const initialValue: SlateElement[] = [
  {
    type: 'paragraph',
    children: [
      {
        text: 'In addition to block nodes, you can create inline nodes, like ',
      },
      {
        type: 'page-ref',
        title: 'game over',
        children: [
          {
            text: '[[!!somebody]]',
          },
        ],
      },
      { text: '-----' },
      {
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Hypertext',
        children: [{ text: 'hyperlinks' }],
      },
      {
        text: '!',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'This example shows hyperlinks in action. It features two ways to add links. You can either add a link via the toolbar icon above, or if you want in on a little secret, copy a URL to your keyboard and paste it while a range of text is selected.',
      },
    ],
  },
]

export default LinkExample
