import { useDispatch, useSelector } from 'react-redux';
import type { ClientDispatch, ClientState } from '#client/store/clientStore.ts';

export const useAppDispatch = useDispatch.withTypes<ClientDispatch>();
export const useAppSelector = useSelector.withTypes<ClientState>();
