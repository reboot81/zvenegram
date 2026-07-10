import { useRef } from 'react'
import type { Dispatch, PointerEvent, SetStateAction } from 'react'
import type { Edge, GridNode } from '../engine/puzzle'

type Props = {
  nodes: GridNode[]
  edges: Edge[]
  activeNodeIds: Set<string>
  selection: string[]
  nodesById: Map<string, GridNode>
  addNode: (id: string) => void
  submitSelection: () => void
  setSelection: Dispatch<SetStateAction<string[]>>
}

export function GameBoard({ nodes, edges, activeNodeIds, selection, nodesById, addNode, submitSelection, setSelection }: Props) {
  const dragging = useRef(false)
  const dragMoved = useRef(false)
  const dragStartNode = useRef<string | null>(null)
  const endDrag = () => {
    dragging.current = false
    dragMoved.current = false
    dragStartNode.current = null
  }
  const handleMove = (event: PointerEvent) => {
    if (!dragging.current) return
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-node-id]')
    if (element?.dataset.nodeId) {
      if (element.dataset.nodeId !== dragStartNode.current) dragMoved.current = true
      addNode(element.dataset.nodeId)
    }
  }

  return <div className="board" onPointerMove={handleMove} onPointerUp={() => {
    if (dragMoved.current) submitSelection()
    endDrag()
  }} onPointerCancel={() => { setSelection([]); endDrag() }} onLostPointerCapture={endDrag}>
    <svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {edges.map(([from, to]) => {
        const a = nodesById.get(from)!
        const b = nodesById.get(to)!
        const selected = selection.some((id, i) => (id === from && selection[i + 1] === to) || (id === to && selection[i + 1] === from))
        return <path key={`${from}-${to}`} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} className={selected ? 'selected-line' : ''} />
      })}
    </svg>
    {nodes.map((node) => {
      const active = activeNodeIds.has(node.id)
      const selectedIndex = selection.indexOf(node.id)
      return <button key={node.id} data-node-id={node.id} disabled={!active}
        className={`letter-node ${active ? '' : 'gone'} ${selectedIndex >= 0 ? 'selected' : ''}`}
        style={{ left: `${node.x}%`, top: `${node.y}%` }} aria-label={`Bokstaven ${node.letter}`}
        onPointerDown={(event) => {
          event.preventDefault()
          if (selection.at(-1) === node.id) { setSelection((value) => value.slice(0, -1)); dragging.current = false; return }
          dragging.current = true; dragMoved.current = false; dragStartNode.current = node.id
          event.currentTarget.setPointerCapture(event.pointerId); addNode(node.id)
        }}>
        {node.letter}{selectedIndex >= 0 && <small>{selectedIndex + 1}</small>}
      </button>
    })}
  </div>
}
