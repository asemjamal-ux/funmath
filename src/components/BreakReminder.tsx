import { useT } from '../app/hooks';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Mascot } from './Mascot';

/** Gentle stretch-break reminder at an item boundary (F-16). */
export function BreakReminder({ open, onKeepGoing, onTakeBreak }: { open: boolean; onKeepGoing: () => void; onTakeBreak: () => void }) {
  const t = useT();
  return (
    <Dialog
      open={open}
      title={t('break.title')}
      onClose={onKeepGoing}
      actions={
        <>
          <Button variant="secondary" onClick={onTakeBreak}>{t('break.takeBreak')}</Button>
          <Button onClick={onKeepGoing}>{t('break.keepGoing')}</Button>
        </>
      }
    >
      <div className="break">
        <Mascot expression="calm" size={120} />
        <p>{t('break.body')}</p>
      </div>
    </Dialog>
  );
}
