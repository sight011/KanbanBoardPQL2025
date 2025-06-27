import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import PropTypes from 'prop-types'
import { useEffect } from 'react'
import './SimpleEditor.css'

const SimpleEditor = ({ content = '', onUpdate, placeholder = 'Enter description...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class: 'simple-editor-content',
      },
    },
  })

  // Sync editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className="simple-editor" id="simple-editor-container">
      <div className="simple-editor-toolbar" id="simple-editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          type="button"
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          type="button"
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
          type="button"
        >
          Underline
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          type="button"
        >
          Ordered List
        </button>
        <button
          onClick={() => {
            const url = window.prompt('Enter URL')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
          type="button"
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} id="simple-editor-prosemirror-wrapper" />
    </div>
  )
}

SimpleEditor.propTypes = {
  content: PropTypes.string,
  onUpdate: PropTypes.func,
  placeholder: PropTypes.string,
}

export default SimpleEditor 