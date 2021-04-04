// @refresh reset
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import isUrl from 'is-url'
import { Portal } from '../components'
import {
  useSlateStatic,
  ReactEditor,
  Slate,
  Editable,
  withReact,
  useSlate,
} from 'slate-react'
import {
  Transforms,
  Editor,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
  Text,
} from 'slate'
import { withHistory } from 'slate-history'
import { LinkElement, PageRefElement, PageTempRefElement } from './custom-types'
import { CHARACTERS } from './mentions'

import { Button, Icon, Toolbar } from '../components'
import { css } from 'emotion'

const LinkExample = () => {
  const [value, setValue] = useState<Descendant[]>(initialValue)
  const ref = useRef()

  const [target, setTarget] = useState<Range | undefined>()
  const [index, setIndex] = useState(0)
  const [search, setSearch] = useState([])
  const [chars, setChars] = useState([])
  const editor = useMemo(
    () => withBiDirection(withLinks(withHistory(withReact(createEditor())))),
    []
  )

  useEffect(() => {
    if (!search[0]) {
      return setChars([])
    }
    console.log(search, ' = search')
    setChars(() => {
      return CHARACTERS.filter((char) => {
        return char.indexOf(search[0]) > -1
      })
    })
  }, [target, search])

  useEffect(() => {
    if (target && chars.length > 0) {
      const el = ref.current
      if (!el) {
        return
      }
      const domRange = ReactEditor.toDOMRange(editor, target)
      const rect = domRange.getBoundingClientRect()
      el.style.top = `${rect.top + window.pageYOffset + 24}px`
      el.style.left = `${rect.left + window.pageXOffset}px`
    }
  }, [chars.length, editor, index, search, target])

  const onKeyDown = useCallback(
    (event) => {
      // console.log(target, ' -------- ', index, chars.length)
      if (target) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault()
            setIndex((index + 1) % chars.length || 0)
            break
          case 'ArrowUp':
            event.preventDefault()
            setIndex(index - 1 < 0 ? chars.length - 1 : index - 1)
            break
          case 'Tab':
            event.preventDefault()
            // TODO：
            // setSearch([chars[index]])
            // setIndex(0)
            Transforms.mergeNodes(editor, {})
            // Transforms.move(editor, { distance: 2 })
            break
          // case 'Esc':
          //   break
          case 'Enter':
            event.preventDefault()
            insertRef(editor, chars[index])
            setTarget(null)
            setSearch([])
            setIndex(0)
            break
        }
      }
    },
    [target, index, editor, chars]
  )

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        setValue(value)
        const { selection } = editor
        console.log(value, ' ---')
        if (selection && Range.isCollapsed(selection)) {
          if (isRefActive(editor)) {
            // TODO: 找到当前的 node
            const [start, end] = Range.edges(selection) // 当前选择的边界
            console.log(start, end)
            console.log(
              // Editor.string(editor, ),
              Editor.string(editor, end)
            )
            const wordBefore = Editor.before(editor, start, { unit: 'word' }) //之前一个连续的 word ，中间没有空格
            const before = wordBefore && Editor.before(editor, wordBefore) // word的之前的位置
            const beforeRange = before && Editor.range(editor, before, start) // word 的range
            console.log(beforeRange.anchor, beforeRange.focus)
            const beforeText = beforeRange && Editor.string(editor, beforeRange) // 取到 word 的字符
            const beforeMatch = beforeText.match(/^\[/)

            const node = Editor.node(editor, beforeRange)
            const after = Editor.after(editor, start)
            const afterRange = Editor.range(editor, start, after)
            const afterText = Editor.string(editor, afterRange)
            // const afterMatch = afterText.match(/^(\s|$)/)
            if (beforeMatch && node[0]?.text) {
              setSearch([beforeText.substring(1), afterText])
              setTarget(beforeRange)
              console.log(
                '@@@',
                beforeMatch,
                beforeRange,
                beforeText,
                afterText
              )
              return
            }
          }
        }
        setSearch([])
        setTarget(null)
        setIndex(0)
      }}
    >
      <Toolbar>
        <LinkButton />
      </Toolbar>
      <Editable
        renderElement={(props) => <Element {...props} />}
        placeholder="Enter some text..."
        onKeyDown={onKeyDown}
      />

      {target && chars.length > 0 && (
        <Portal>
          <div
            ref={ref}
            style={{
              top: '-9999px',
              left: '-9999px',
              position: 'absolute',
              zIndex: 1,
              padding: '3px',
              background: 'white',
              borderRadius: '4px',
              boxShadow: '0 1px 5px rgba(0,0,0,.2)',
            }}
          >
            {chars.map((char, i) => (
              <div
                key={char}
                style={{
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: i === index ? '#B4D5FF' : 'transparent',
                }}
              >
                {char}
              </div>
            ))}
          </div>
        </Portal>
      )}
    </Slate>
  )
}
const withBiDirection = (editor: Editor) => {
  const { normalizeNode } = editor

  editor.normalizeNode = ([node, path]) => {
    if (
      !Editor.isBlock(editor, node) &&
      node.text !== undefined &&
      Editor.parent(editor, path)[0].type !== 'page-ref' &&
      Text.isText(node)
    ) {
      const parent = Editor.parent(editor, path)
      console.log(parent, ' --')
      const reg = /\[\[([^\[]+)?]]/gi
      let ary = [] as any
      while ((ary = reg.exec(node.text))) {
        console.log(ary[0], ary.index)
        const text = ary[0]
        const startIndex = ary.index
        const length = text.length
        // Transforms.removeNodes(editor, {
        //   at: path,
        // });
        // ranges.push({
        //   anchor: { path, offset: offset - search.length },
        //   focus: { path, offset },
        //   highlight: true,
        // })

        // Transforms.delete(editor, { at: path })

        // const textBack = node.text.substring(0, startIndex)
        // const textFore = node.text.substr(startIndex + length)
        // Transforms.insertText(editor, textBack, {})
        // // Transforms.collapse(editor, { edge: 'end' })
        const pageRef: PageRefElement = {
          type: 'page-ref',
          title: text,
          children: [{ text }],
        }
        const range = {
          anchor: { path, offset: startIndex },
          focus: { path, offset: startIndex + length },
        }
        Transforms.setSelection(editor, range)
        // Transforms.setNodes(editor, pageRef, {
        //   at: range,
        // split: true,
        // match: Text.isText,
        // })
        Transforms.setNodes(
          editor,
          {
            key: true,
            type: 'page-ref',
            title: 'game over',
            children: [
              {
                text: '[[!!somebody]]',
              },
            ],
          },
          { split: true }
        )
        // Transforms.insertNodes(editor, pageRef, {})

        // path[1] = path[1]
        // Transforms.insertNodes(editor, { text: textFore }, {})
      }

      // Transforms.insertNodes(editor, pageRef)
    }
    normalizeNode([node, path])
  }

  return editor
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

      // const pageRef: PageRefElement = {
      //   type: 'page-ref',
      //   title: text,
      //   children: [{ text: `[[${text}]]` }],
      // }
      // Transforms.insertText(editor, '[]')
      if (isTempRefActive(editor)) {
        wrapRef(editor, '')
      } else {
        wrapTempRef(editor, '')
      }
    } else {
      unwrapTempRef(editor)
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
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'page-ref',
  })
}

const unwrapTempRef = (editor: Editor) => {
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

  const pageRef: PageRefElement = {
    type: 'page-ref',
    title: text,
    children: [{ text: `[[${text}]]` }],
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

function PageRef(props) {
  const editor = useSlateStatic()
  const { attributes, children, element } = props
  useEffect(() => {
    // console.log(' -----@@', element.children[0])
    const path = ReactEditor.findPath(editor, element)
    const newProperties: Partial<SlateElement> = {
      title: element.children[0].text,
    }
    console.log(children, '-----')
    // Transforms.setNodes(editor, newProperties, { at: path })
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
          onClick={() => {
            console.log('-----')
          }}
          className={css``}
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

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {
        text: 'In addition to block nodes, you can create inline nodes, like ',
      },
      // {
      //   type: 'page-ref',
      //   title: 'game over',
      //   children: [
      //     {
      //       text: '[[!!somebody]]',
      //     },
      //   ],
      // },
      { text: '-----' },
      {
        type: 'link',
        url: 'https://en.wikipedia.org/wiki/Hypertext',
        children: [{ text: 'hyperlinks' }],
      },
      {
        text: '![[干什么]askljd[[没有干什么] askljd',
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
