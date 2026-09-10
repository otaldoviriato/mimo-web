import UserProfileScreen from '@/components/screens/UserProfileScreen';

export default function Page({ params }: { params: Promise<{ username: string }> }) {
    return <UserProfileScreen params={params} />;
}
