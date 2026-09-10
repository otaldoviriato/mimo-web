'use client';

import { use } from 'react';
import ChatPage from '@/components/screens/ChatScreen';

// The app layout canonicalizes this alias and initializes its stack before rendering.
export default function UsernameChatPage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = use(params);
    return <ChatPage userId={username.replace(/^@/, '')} isSubPage />;
}
