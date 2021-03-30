// @refresh reset
import React, { useEffect, useMemo, useState } from 'react';
import {
    Slate,
    Editable,
    withReact,
} from 'slate-react'
import {
  createEditor,
  Descendant,
  Element as SlateElement,
  Transforms
} from 'slate'

const initialValue: SlateElement[] = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Typing here...',
      },
    ],
  }]


export default function Learn(props) {
  const [value, setValue] = useState<Descendant[]>(initialValue);
  const editor = useMemo(
    () => withReact(createEditor() as any),
    []
  ); 
    return <Slate 
    editor={editor} value={value} onChange={(value) => { 
        setValue(value)}}>
        <Editable />
    </Slate>
}
