import { type FormEvent, useState } from 'react';
import { joinRoom } from '#client/connection/serverApi.ts';
import { useRequestInFlight } from '#client/connection/useRequestInFlight.ts';
import { MiniWindow } from '#client/MiniWindow.tsx';
import { canJoin } from '#client/namePrompt/namePromptView.ts';
import { useAppDispatch } from '#client/store/hooks.ts';
import { MAX_NAME_LENGTH } from '#server/roomStore/roomSlice.ts';

export function NamePrompt() {
  const dispatch = useAppDispatch();
  const [typedName, setTypedName] = useState('');
  const { requestInFlight, sendRequest } = useRequestInFlight();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canJoin(typedName, requestInFlight)) {
      return;
    }
    await sendRequest(() => joinRoom(dispatch, typedName.trim()));
  }

  return (
    <MiniWindow title="Name" className="mini-window-narrow">
      <form onSubmit={handleSubmit} className="window-actions">
        <input
          aria-label="Name"
          value={typedName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setTypedName(event.target.value)}
          className="text-input"
        />
        <button type="submit" className="outline-button red-ring-on-hover">
          Join
        </button>
      </form>
    </MiniWindow>
  );
}
