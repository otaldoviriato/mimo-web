'use client';

import React from 'react';
import { ClientsTable } from '@/components/admin/ClientsTable';

export default function AdminClientsPage() {
    return (
        <div className="w-full">
            <ClientsTable />
        </div>
    );
}
