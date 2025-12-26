/**
 * Bubble Menu
 *
 * Floating toolbar that appears when text is selected.
 * Provides quick access to formatting options.
 * Custom implementation using tippy.js for Tiptap v3.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  Code,
  Link as LinkIcon,
  HighlighterCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface BubbleMenuProps {
  editor: Editor;
}

function BubbleButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

export function BubbleMenuComponent({ editor }: BubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyRef = useRef<TippyInstance | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Safely get coordinates for a position, returns null if position is out of range
  const safeGetCoords = useCallback((pos: number) => {
    try {
      const docSize = editor.state.doc.content.size;
      // Clamp position to valid range (0 to docSize)
      const safePos = Math.max(0, Math.min(pos, docSize));
      return editor.view.coordsAtPos(safePos);
    } catch {
      return null;
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setShowLinkInput(false);
  }, [editor]);

  // Create and manage tippy instance
  useEffect(() => {
    if (!menuRef.current) return;

    // Create a virtual reference element for positioning
    const virtualReference = document.createElement('div');
    virtualReference.style.position = 'fixed';
    virtualReference.style.pointerEvents = 'none';
    document.body.appendChild(virtualReference);

    const instance = tippy(virtualReference, {
      content: menuRef.current,
      appendTo: () => document.body,
      interactive: true,
      trigger: 'manual',
      placement: 'top',
      animation: 'shift-away',
      duration: 150,
      hideOnClick: false,
      // Prevent scroll jumping
      popperOptions: {
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 8,
            },
          },
        ],
      },
      getReferenceClientRect: () => {
        const { from, to } = editor.state.selection;
        const start = safeGetCoords(from);
        const end = safeGetCoords(to);

        // Return a center-screen fallback rect if coords couldn't be resolved
        if (!start || !end) {
          return {
            top: window.innerHeight / 2,
            bottom: window.innerHeight / 2,
            left: window.innerWidth / 2,
            right: window.innerWidth / 2,
            width: 0, height: 0,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            toJSON: () => ({}),
          } as DOMRect;
        }

        return {
          top: start.top,
          bottom: end.bottom,
          left: start.left,
          right: end.right,
          width: end.right - start.left,
          height: end.bottom - start.top,
          x: start.left,
          y: start.top,
          toJSON: () => ({}),
        } as DOMRect;
      },
    });

    tippyRef.current = instance;

    return () => {
      instance.destroy();
      virtualReference.remove();
    };
  }, [editor, safeGetCoords]);

  // Show/hide based on selection
  useEffect(() => {
    const updateMenu = () => {
      const { from, to, empty } = editor.state.selection;

      // Don't show for empty selections or node selections
      if (empty || from === to) {
        tippyRef.current?.hide();
        setShowLinkInput(false);
        return;
      }

      // Don't show if selecting across nodes that shouldn't have formatting
      const { doc } = editor.state;
      let hasText = false;
      doc.nodesBetween(from, to, (node) => {
        if (node.isText) hasText = true;
      });

      if (!hasText) {
        tippyRef.current?.hide();
        return;
      }

      // Validate positions are within document bounds
      const docSize = editor.state.doc.content.size;
      if (from > docSize || to > docSize) {
        tippyRef.current?.hide();
        return;
      }

      // Get coordinates safely
      const start = safeGetCoords(from);
      const end = safeGetCoords(to);

      if (!start || !end) {
        tippyRef.current?.hide();
        return;
      }

      // Update position and show
      tippyRef.current?.setProps({
        getReferenceClientRect: () => {
          return {
            top: start.top,
            bottom: end.bottom,
            left: start.left,
            right: end.right,
            width: end.right - start.left,
            height: end.bottom - start.top,
            x: start.left,
            y: start.top,
            toJSON: () => ({}),
          } as DOMRect;
        },
      });
      tippyRef.current?.show();
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('transaction', updateMenu);

    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('transaction', updateMenu);
    };
  }, [editor, safeGetCoords]);

  return (
    <div
      ref={menuRef}
      className="bubble-menu flex items-center gap-0.5 px-2 py-1.5 bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl border border-gray-700"
    >
      {showLinkInput ? (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL..."
            className="w-48 px-2 py-1 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-coral"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setLink();
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
            autoFocus
          />
          <button
            onClick={setLink}
            className="px-2 py-1 text-sm bg-coral text-white rounded hover:bg-coral-hover"
          >
            Add
          </button>
          {editor.isActive('link') && (
            <button
              onClick={removeLink}
              className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <>
          <BubbleButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <TextB className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <BubbleButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <TextItalic className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <BubbleButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <TextUnderline className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <BubbleButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <TextStrikethrough className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <div className="w-px h-4 bg-gray-600 mx-1" />

          <BubbleButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <BubbleButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <HighlighterCircle className="w-4 h-4" weight="bold" />
          </BubbleButton>

          <div className="w-px h-4 bg-gray-600 mx-1" />

          <BubbleButton
            onClick={() => {
              const previousUrl = editor.getAttributes('link').href;
              setLinkUrl(previousUrl || '');
              setShowLinkInput(true);
            }}
            isActive={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" weight="bold" />
          </BubbleButton>
        </>
      )}
    </div>
  );
}

export default BubbleMenuComponent;
