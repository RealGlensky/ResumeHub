import { UserSearch } from "@/components/user-search";
import { NetworkManager } from "@/components/network-manager";

export default function NetworkPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">My Network</h1>

      {/* Search section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Find Connections</h2>
        <UserSearch />
      </div>

      {/* Network management section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Network Overview</h2>
        <NetworkManager />
      </div>
    </div>
  );
}