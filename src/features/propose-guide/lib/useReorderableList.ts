import { ref } from 'vue'

/** Drag-reorder helpers for an ordered list of items. */
export function useReorderableList<T>(getList: () => T[], setList: (next: T[]) => void) {
  const dragFrom = ref<number | null>(null)
  const dragOver = ref<number | null>(null)

  function onDragStart(i: number, e: DragEvent) {
    dragFrom.value = i
    dragOver.value = i
    e.dataTransfer?.setData('text/plain', String(i))
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(i: number) {
    dragOver.value = i
  }

  function onDragEnd() {
    dragFrom.value = null
    dragOver.value = null
  }

  function onDrop(i: number) {
    const from = dragFrom.value
    if (from == null || from === i) {
      onDragEnd()
      return
    }
    const next = [...getList()]
    const [item] = next.splice(from, 1)
    if (!item) {
      onDragEnd()
      return
    }
    next.splice(i, 0, item)
    setList(next)
    onDragEnd()
  }

  function resetDrag() {
    onDragEnd()
  }

  return {
    dragFrom,
    dragOver,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    resetDrag,
  }
}
