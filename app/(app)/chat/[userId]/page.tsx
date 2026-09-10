import ChatScreen from '@/components/screens/ChatScreen';

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
    return <ChatScreen params={params} />;
}
