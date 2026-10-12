'use client';

import React, { Suspense } from 'react';
import { RoomsTab } from '@/components/admin/RoomsTab';

export default function AdminRoomsPage() {
    return (
        <div className="w-full">
            <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando auditoria de conversas...</div>}>
                <RoomsTab />
            </Suspense>
        </div>
    );
}
