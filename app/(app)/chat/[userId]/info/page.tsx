import ChatInfoScreen from '@/components/screens/ChatInfoScreen';

export default function Page({ params }: { params: Promise<{ userId: string }> }) {
    return <ChatInfoScreen params={params} />;
}
