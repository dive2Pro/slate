// @refresh reset
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Slate, Editable, withReact } from 'slate-react'
import {
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Transforms,
  Range,
} from 'slate'
import { PageRefElement } from './custom-types'

const initialValue: SlateElement[] = [
  {
    type: 'paragraph',
    children: [
      {
        text: 'Typing here...',
      },
    ],
  },
  // {
  //   type: 'paragraph',
  //   children: [
  //     {
  //       text: 'say hello to ',
  //     },
  //     {
  //       type: 'page-ref',
  //       title: 'images',
  //       children: [
  //         {
  //           text: 'images',
  //         },
  //       ],
  //     },
  //   ],
  // },
]

function PageRef(props) {
  console.log(props)
  const { element } = props
  useEffect(() => {
    console.log(element.title)
  }, [element.title])
  return <span {...props.attributes}>[{props.children}]</span>
}

function Element(props) {
  const { element, attributes, children } = props
  switch (element.type) {
    case 'page-ref':
      return <PageRef {...props} />
    default:
      return <p {...attributes}>{children}</p>
  }
}

function withPageRef(editor) {
  const { isInline, isVoid } = editor

  editor.isInline = (element) => {
    return element.type === 'page-ref' ? true : isInline(element)
  }

  // editor.isVoid = (element) => {
  //   return element.type === 'page-ref' ? true : isVoid(element)
  // }
  return editor
}

export default function Impl(props) {
  const [value, setValue] = useState<Descendant[]>(initialValue)
  const editor = useMemo(
    () => withReact(withPageRef(createEditor() as any)),
    []
  )

  const decorate = useCallback(([node, path]) => {
    const ranges = []

    // console.group('decorate')
    // console.log(node, ' --- ', path)
    if (node.type === 'page-ref') {
      const { title } = node
      let offset = 0

      // ranges.push({
      //   anchor: { path, offset: offset - 2 },
      //   focus: { path, offset },
      //   highlight: true,
      // })

      // ranges.push({
      //   anchor: { path, offset: offset + 2 },
      //   focus: { path, offset },
      //   highlight: true,
      // })
    }

    console.groupEnd()
    return ranges
  }, [])

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        setValue(value)
        // const { selection } = editor
        // if (selection && Range.isCollapsed(selection)) {
        //   // console.log(selection, '------@@')
        // }
      }}
    >
      <Editable
        // decorate={decorate}
        // renderLeaf={Leaf}
        onKeyDown={(event) => {
          // TODO: 连续输入 [[[呢， 只以最后的为准， 并删除之前创建的
          if (event.key === '[') {
            // Prevent the ampersand character from being inserted.
            // 当发现有两个 [ 的时候再把它置为 page-ref
            const { selection } = editor

            if (selection && Range.isCollapsed(selection)) {
            }
            // const [start] = Range.edges(selection) // 当前选择的边界
            // const wordBefore = Editor.before(editor, start, { unit: 'word' }) //之前一个连续的 word ，中间没有空格

            // const before = wordBefore && Editor.before(editor, wordBefore) // word的之前的位置
            // const beforeRange = before && Editor.range(editor, before, start) // word 的range
            // const beforeText = beforeRange && Editor.string(editor, beforeRange) // 取到 word 的字符
            // console.log(beforeText, '---sekection')
            event.preventDefault()
            const pageRef: PageRefElement = {
              type: 'page-ref',
              title: '',
              children: [{ text: '' }],
            }
            Transforms.insertNodes(editor, pageRef)
          }
        }}
        renderElement={Element}
      />
    </Slate>
  )
}

function Leaf({ attributes, leaf, children }) {
  console.log(leaf, ' --- leaf')
  return (
    <span
      {...attributes}
      style={{
        fontWeight: leaf.bold ? 'bold' : 'normal',
        fontStyle: leaf.italic ? 'italic' : 'normal',
      }}
    >
      {children}
    </span>
  )
}
