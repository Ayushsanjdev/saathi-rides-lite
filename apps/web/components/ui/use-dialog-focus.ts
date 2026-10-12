'use client';
import {useRef} from 'react';

/** Controlled dialogs do not necessarily have a Radix Trigger to return focus to. */
export function useDialogFocus({onOpenAutoFocus,onCloseAutoFocus}:{onOpenAutoFocus?:(event:Event)=>void;onCloseAutoFocus?:(event:Event)=>void}){
  const opener=useRef<HTMLElement|null>(null);
  return {
    onOpenAutoFocus(event:Event){
      opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
      onOpenAutoFocus?.(event);
    },
    onCloseAutoFocus(event:Event){
      onCloseAutoFocus?.(event);
      if(event.defaultPrevented)return;
      event.preventDefault();
      // A successful sign-in may immediately open the booking review dialog.
      if(document.querySelector('[role=dialog][data-state=open],[role=alertdialog][data-state=open]'))return;
      const target=opener.current;
      if(target&&target!==document.body&&target.isConnected&&target.checkVisibility()&&!target.matches(':disabled'))target.focus({preventScroll:true});
      else document.querySelector<HTMLElement>('main')?.focus({preventScroll:true});
    },
  };
}
