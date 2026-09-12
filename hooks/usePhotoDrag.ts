'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';

type Point = { x: number; y: number };
type Drag = { index: number; id: number; touch: boolean; start: Point; point: Point; active: boolean; target: number; element: HTMLElement };

function scrollParents(element: HTMLElement): HTMLElement[] {
    const parents: HTMLElement[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) parents.push(parent);
    }
    const root = document.scrollingElement as HTMLElement | null;
    if (root && !parents.includes(root)) parents.push(root);
    return parents;
}

export function usePhotoDrag(count: number, disabled: boolean, onReorder: (from: number, to: number) => void, onActivate?: () => void) {
    const gridRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<Drag | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const frameRef = useRef<number | null>(null);
    const unlockRef = useRef<(() => void) | null>(null);
    const latest = useRef({ count, disabled, onReorder, onActivate });
    useEffect(() => { latest.current = { count, disabled, onReorder, onActivate }; }, [count, disabled, onReorder, onActivate]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dragPosition, setDragPosition] = useState<Point | null>(null);
    const [selectingIndex, setSelectingIndex] = useState<number | null>(null);

    const clear = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        timerRef.current = null;
        frameRef.current = null;
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag && !drag.touch && drag.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id);
        unlockRef.current?.();
        unlockRef.current = null;
    }, []);
    const finish = useCallback((commit: boolean) => {
        const drag = dragRef.current;
        clear();
        setSelectingIndex(null);
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDragPosition(null);
        if (commit && drag?.active && drag.target !== drag.index) latest.current.onReorder(drag.index, drag.target);
    }, [clear]);
    const hitTest = useCallback(() => {
        const drag = dragRef.current;
        if (!drag?.active) return;
        const cards = document.elementsFromPoint(drag.point.x, drag.point.y);
        for (const element of cards) {
            const card = element.closest<HTMLElement>('[data-photo-index]');
            if (!card || !gridRef.current?.contains(card)) continue;
            const index = Number(card.dataset.photoIndex);
            if (Number.isInteger(index) && index >= 0 && index < latest.current.count) {
                drag.target = index;
                setDragOverIndex(index);
                break;
            }
        }
    }, []);
    const begin = (element: HTMLElement, index: number, point: Point, id: number, touch: boolean) => {
        if (latest.current.disabled || dragRef.current) return;
        if ((element.ownerDocument.activeElement as HTMLElement | null)?.tagName === 'INPUT') (element.ownerDocument.activeElement as HTMLElement).blur();
        dragRef.current = { index, id, touch, start: point, point, active: false, target: index, element };
        setSelectingIndex(index);
        timerRef.current = setTimeout(() => {
            const drag = dragRef.current;
            if (!drag || latest.current.disabled) { finish(false); return; }
            drag.active = true;
            const parents = scrollParents(element);
            const locked = [...new Set([...parents, document.body, document.documentElement])].map(parent => {
                const original = { overflow: parent.style.overflow, overscrollBehavior: parent.style.overscrollBehavior, userSelect: parent.style.userSelect, scrollBehavior: parent.style.scrollBehavior };
                parent.style.overflow = 'hidden';
                parent.style.overscrollBehavior = 'none';
                parent.style.userSelect = 'none';
                parent.style.scrollBehavior = 'auto';
                return { parent, original };
            });
            unlockRef.current = () => { for (const { parent, original } of locked) Object.assign(parent.style, original); };
            if (!touch) { try { element.setPointerCapture(id); } catch {} }
            latest.current.onActivate?.();
            setDraggedIndex(index);
            setSelectingIndex(null);
            setDragOverIndex(index);
            setDragPosition(drag.point);
            let previous = performance.now();
            const frame = (time: number) => {
                const active = dragRef.current;
                if (!active?.active) return;
                const dt = Math.min(32, time - previous) / 1000;
                previous = time;
                for (const parent of parents) {
                    const rect = parent === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : parent.getBoundingClientRect();
                    const top = Math.max(0, rect.top);
                    const bottom = Math.min(window.innerHeight, rect.bottom);
                    const edge = Math.min(80, (bottom - top) / 4);
                    if (edge <= 0) continue;
                    const up = Math.min(1, Math.max(0, (top + edge - active.point.y) / edge));
                    const down = Math.min(1, Math.max(0, (active.point.y - bottom + edge) / edge));
                    const delta = (down - up) * 750 * dt;
                    if (!delta) break;
                    const before = parent.scrollTop;
                    parent.scrollTop = Math.max(0, Math.min(parent.scrollHeight - parent.clientHeight, before + delta));
                    if (parent.scrollTop !== before) break;
                }
                hitTest();
                frameRef.current = requestAnimationFrame(frame);
            };
            frameRef.current = requestAnimationFrame(frame);
        }, 350);
    };

    useEffect(() => {
        const move = (x: number, y: number, event: Event) => {
            const drag = dragRef.current;
            if (!drag) return;
            if (!drag.active) {
                if (Math.hypot(x - drag.start.x, y - drag.start.y) > 8) finish(false);
                return;
            }
            if (event.cancelable) event.preventDefault();
            drag.point = { x, y };
            setDragPosition(drag.point);
            hitTest();
        };
        const touchMove = (event: TouchEvent) => {
            const drag = dragRef.current;
            if (!drag?.touch) return;
            if (event.touches.length !== 1) { finish(false); return; }
            const touch = Array.from(event.touches).find(item => item.identifier === drag.id);
            if (touch) move(touch.clientX, touch.clientY, event);
        };
        const touchEnd = (event: TouchEvent) => {
            const drag = dragRef.current;
            if (drag?.touch && Array.from(event.changedTouches).some(touch => touch.identifier === drag.id)) finish(event.type === 'touchend');
        };
        const pointerMove = (event: PointerEvent) => { const drag = dragRef.current; if (drag && !drag.touch && drag.id === event.pointerId) move(event.clientX, event.clientY, event); };
        const pointerEnd = (event: PointerEvent) => { const drag = dragRef.current; if (drag && !drag.touch && drag.id === event.pointerId) finish(event.type === 'pointerup'); };
        const preventScroll = (event: Event) => { if (dragRef.current?.active && event.cancelable) event.preventDefault(); };
        const cancel = () => finish(false);
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(false); };
        document.addEventListener('touchmove', touchMove, { passive: false });
        document.addEventListener('touchend', touchEnd);
        document.addEventListener('touchcancel', touchEnd);
        document.addEventListener('pointermove', pointerMove, { passive: false });
        document.addEventListener('pointerup', pointerEnd);
        document.addEventListener('pointercancel', pointerEnd);
        document.addEventListener('wheel', preventScroll, { passive: false });
        document.addEventListener('contextmenu', preventScroll);
        document.addEventListener('keydown', onKey);
        window.addEventListener('blur', cancel);
        return () => {
            clear();
            document.removeEventListener('touchmove', touchMove);
            document.removeEventListener('touchend', touchEnd);
            document.removeEventListener('touchcancel', touchEnd);
            document.removeEventListener('pointermove', pointerMove);
            document.removeEventListener('pointerup', pointerEnd);
            document.removeEventListener('pointercancel', pointerEnd);
            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('contextmenu', preventScroll);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('blur', cancel);
        };
    }, [clear, finish, hitTest]);

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>, index: number) => {
        if (event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary) return;
        begin(event.currentTarget, index, { x: event.clientX, y: event.clientY }, event.pointerId, false);
    };
    const onTouchStart = (event: ReactTouchEvent<HTMLElement>, index: number) => {
        if (event.touches.length !== 1) { finish(false); return; }
        const touch = event.touches[0];
        begin(event.currentTarget, index, { x: touch.clientX, y: touch.clientY }, touch.identifier, true);
    };
    return { gridRef, draggedIndex, dragOverIndex, dragPosition, selectingIndex, onPointerDown, onTouchStart };
}
