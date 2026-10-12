'use client';
import {useRef} from 'react';
import {useMutation,type UseMutationOptions} from '@tanstack/react-query';

/** Close the gap between an action firing and React rendering its disabled state. */
export function useSingleMutation<TData=unknown,TError=Error,TVariables=void,TContext=unknown>(options:UseMutationOptions<TData,TError,TVariables,TContext>){
  const locked=useRef(false);
  const mutation=useMutation({...options,onSettled:async(...args)=>{
    try{await options.onSettled?.(...args);}finally{locked.current=false;}
  }});
  function mutate(...args:Parameters<typeof mutation.mutate>){
    if(locked.current)return;
    locked.current=true;
    mutation.mutate(...args);
  }
  return {...mutation,mutate};
}
