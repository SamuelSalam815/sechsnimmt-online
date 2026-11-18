import { type FormEvent, useState } from 'react';
import { useAppDispatch } from '#client/hooks.ts';
import { canJoin } from '#client/namePromptView.ts';
import { joinRoom } from '#client/serverApi.ts';
import { MAX_NAME_LENGTH } from '#server/roomStore/roomSlice.ts';

export function NamePrompt() {
  const dispatch = useAppDispatch();
  const [typedName, setTypedName] = useState('');
  const [joinInFlight, setJoinInFlight] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canJoin(typedName, joinInFlight)) {
      return;
    }
    setJoinInFlight(true);
    await joinRoom(dispatch, typedName.trim());
    setJoinInFlight(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name{' '}
        <input
          value={typedName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setTypedName(event.target.value)}
        />
      </label>{' '}
      <button type="submit">Join</button>
    </form>
  );
}
