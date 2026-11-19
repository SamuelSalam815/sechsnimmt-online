export function NameTag({ name, marked }: { name: string; marked: boolean }) {
  return (
    <span className={marked ? 'name-tag negative-text' : 'name-tag'}>
      {name}
    </span>
  );
}
