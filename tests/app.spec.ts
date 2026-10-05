import {test,expect,type Page} from '@playwright/test';
async function signIn(page:Page,role:'Passenger'|'Driver'|'Operator'){
  await page.goto('/');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:`Try ${role.toLowerCase()}`,exact:true}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).last().click();
  await expect(page.getByRole('button',{name:'Account',exact:true}).first()).toBeVisible();
}
test('mobile booking and cancellation with a real account',async({page})=>{
  await signIn(page,'Passenger');
  await page.getByRole('button',{name:'Tomorrow',exact:true}).click();
  await page.getByRole('button',{name:'Find rides',exact:true}).click();
  await page.getByRole('button',{name:'Book ride',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Mobile number').fill('9000000099');
  await page.getByRole('button',{name:'Confirm booking',exact:true}).click();
  await expect(page.getByText('Booking confirmed',{exact:true})).toBeVisible();
  await expect(page.getByText('Pay the driver in cash',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Cancel booking',exact:true}).first().click();
  await page.getByRole('button',{name:'Yes, cancel booking',exact:true}).click();
  await expect(page.getByText('Booking cancelled',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('operator creates a trip and driver accepts the assignment',async({page})=>{
  await signIn(page,'Operator');
  await page.getByRole('button',{name:'New departure',exact:true}).click();
  await page.getByLabel('Departure date and time').fill(new Date(Date.now()+3*86400000).toISOString().slice(0,16));
  await page.getByRole('button',{name:'Create departure',exact:true}).click();
  await expect(page.getByText('Departure created',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Account',exact:true}).first().click();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await signIn(page,'Driver');
  await expect(page.getByRole('heading',{name:'Your trips',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Accept trip',exact:true}).first().click();
  await expect(page.getByText('Trip accepted',{exact:true})).toBeVisible();
});
test('Hindi interface and keyboard-friendly login',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'हिन्दी',exact:true}).click();
  await expect(page.getByRole('heading',{name:'कहाँ जाना है?',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
