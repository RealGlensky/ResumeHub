import { NetworkManager } from "@/components/network-manager";

export default function NetworkPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">My Network</h1>
      <NetworkManager />
    </div>
  );
}