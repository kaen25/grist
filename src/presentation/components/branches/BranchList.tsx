import { BranchItem } from './BranchItem';
import type { Branch } from '@/domain/entities';

interface BranchListProps {
  title: string;
  branches: Branch[];
  onRefresh: () => void;
}

export function BranchList({ title, branches, onRefresh }: BranchListProps) {
  if (branches.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title} ({branches.length})
      </h3>
      <div className="space-y-1">
        {branches.map((branch) => (
          <BranchItem
            key={`${branch.remote_name ?? 'local'}-${branch.name}`}
            branch={branch}
            onAction={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
