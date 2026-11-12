import { Lock } from 'lucide-react';
import { Card, EmptyState } from './ui';

/** 403 page body for sections the signed-in role cannot use. */
export function Forbidden({ what = 'this section' }: { what?: string }) {
  return (
    <Card>
      <EmptyState
        icon={Lock}
        title="You don't have access"
        description={`Your role can't use ${what}. If you need it, ask an administrator to change your role.`}
      />
    </Card>
  );
}
