'use client';

import { useRef, useState } from 'react';
import { usePhotoDrag } from '../../../hooks/usePhotoDrag';

export function PhotoDragHarness() {
    const [items, setItems] = useState(Array.from({ length: 16 }, (_, index) => index + 1));
    const [result, setResult] = useState('Ainda não executado');
    const [running, setRunning] = useState(false);
    const scroller = useRef<HTMLDivElement>(null);
    const reorderCount = useRef(0);
    const drag = usePhotoDrag(items.length, false, (from, to) => {
        reorderCount.current++;
        setItems(current => { const next = [...current]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; });
    });
    const simulate = async () => {
        setRunning(true);
        reorderCount.current = 0;
        setResult('Validando…');
        const panel = scroller.current!;
        panel.scrollIntoView({ block: 'center', behavior: 'instant' });
        panel.scrollTop = 0;
        const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        await pause(100);
        const first = drag.gridRef.current!.querySelector<HTMLElement>('[data-photo-index="0"]')!;
        const rect = first.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        let y = rect.top + 30;
        const fire = (type: string, active = true) => {
            const touch = new Touch({ identifier: 17, target: first, clientX: x, clientY: y });
            const event = new TouchEvent(type, { bubbles: true, cancelable: true, touches: active ? [touch] : [], targetTouches: active ? [touch] : [], changedTouches: [touch] });
            first.dispatchEvent(event);
            return event.defaultPrevented;
        };
        const checks: string[] = [];
        const expect = (condition: boolean, label: string) => { if (!condition) throw new Error(label); checks.push(label); };
        try {
            fire('touchstart');
            y += 20;
            expect(!fire('touchmove'), 'rolagem normal antes da seleção');
            fire('touchend', false);
            await pause(400);
            expect(panel.style.overflow !== 'hidden', 'deslize curto não seleciona');
            y = rect.top + 30;
            fire('touchstart');
            await pause(400);
            expect(panel.style.overflow === 'hidden', 'toque longo bloqueia scroll nativo');
            const middle = panel.getBoundingClientRect();
            y = middle.top + middle.height / 2;
            const before = panel.scrollTop;
            expect(fire('touchmove'), 'touchmove cancelável é bloqueado');
            await pause(100);
            expect(Math.abs(panel.scrollTop - before) < 1, 'arraste no centro não rola');
            y = Math.min(window.innerHeight, middle.bottom) - 6;
            fire('touchmove');
            await pause(900);
            const down = panel.scrollTop;
            expect(down > 100, 'borda inferior rola automaticamente');
            y = Math.max(0, middle.top) + 6;
            fire('touchmove');
            await pause(500);
            expect(panel.scrollTop < down, 'borda superior rola automaticamente');
            y = Math.min(window.innerHeight, middle.bottom) - 30;
            fire('touchmove');
            await pause(200);
            fire('touchend', false);
            await pause(100);
            expect(panel.style.overflow !== 'hidden', 'soltar restaura scroll');
            expect(reorderCount.current === 1, 'nova ordem aplicada uma única vez');
            const afterDrop = panel.scrollTop;
            await pause(200);
            expect(panel.scrollTop === afterDrop, 'autoscroll termina ao soltar');
            fire('touchstart');
            await pause(400);
            expect(panel.style.overflow === 'hidden', 'novo arraste pode iniciar');
            fire('touchcancel', false);
            await pause(100);
            expect(panel.style.overflow !== 'hidden' && reorderCount.current === 1, 'cancelar restaura scroll sem reordenar');
            setResult('PASSOU · ' + checks.join(' · '));
        } catch (error) {
            fire('touchcancel', false);
            setResult('FALHOU · ' + (error instanceof Error ? error.message : String(error)));
        } finally { setRunning(false); }
    };
    return <section className="space-y-3 rounded-2xl border bg-white p-4" aria-label="Teste do arraste de fotos">
        <h2 className="font-bold">Fotos do perfil · toque longo</h2>
        <button disabled={running} onClick={() => void simulate()} className="rounded-xl bg-purple-600 p-3 text-sm font-bold text-white disabled:opacity-50">Validar arraste por toque</button>
        <p role="status" data-testid="drag-result" className="text-xs leading-relaxed">{result}</p>
        <div ref={scroller} className="h-96 overflow-y-auto rounded-xl border p-3">
            <div ref={drag.gridRef} className="grid grid-cols-2 gap-3">
                {items.map((item, index) => <div key={item} data-photo-index={index} onPointerDown={event => drag.onPointerDown(event, index)} onTouchStart={event => drag.onTouchStart(event, index)} style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' }} className={`flex aspect-[3/4] select-none items-center justify-center rounded-xl border bg-purple-50 text-2xl font-black text-purple-800 ${drag.draggedIndex === index ? 'opacity-20' : ''} ${drag.dragOverIndex === index ? 'ring-4 ring-purple-500' : ''}`}>
                    Foto {item}
                </div>)}
            </div>
        </div>
        {drag.dragPosition && <div className="pointer-events-none fixed z-50 rounded-xl bg-purple-600 px-5 py-8 text-white shadow-xl" style={{ left: drag.dragPosition.x, top: drag.dragPosition.y, transform: 'translate(-50%, -50%)' }}>Foto selecionada</div>}
    </section>;
}
