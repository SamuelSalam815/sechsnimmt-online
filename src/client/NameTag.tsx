// The room marks a ready player and the game a player who has picked.
export function NameTag({ name, marked }: { name: string; marked: boolean }) {
  return (
    <span className={marked ? 'name-tag negative-text' : 'name-tag'}>
      {name}
    </span>
  );
}
