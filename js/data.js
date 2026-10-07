
const DEFAULTS = {
  month: "2026-10",
  roomRent: 7500,
  tenantRent: 2500,
  capacity: 3
};
const KEY = "hs_height_data_v1";
const AUTH_KEY = "hs_height_auth";

const names = [
  ["Ahmed Khan","9876543210"],["Bilal Ahmad","9876543211"],["Sameer Rizvi","9876543212"],
  ["Mohd Gulfam","9876543213"],["Mohd Rizwan","9876543214"],["Mohd Anas Shakeel","9876543215"],
  ["Sahil Sharma","9876543216"],["Faizan Ali","9876543217"],["Zaheer Ahmed","9876543218"],
  ["Aman Tiwari","9876543219"],["Vikash Singh","9876543220"],["Imran Khan","9876543221"],
  ["Rehan Ali","9876543222"],["Kashif Ansari","9876543223"],["Naved Khan","9876543224"],
  ["Sameer Ali","9876543225"],["Danish Khan","9876543226"],["Arman Sheikh","9876543227"],
  ["Umar Farooq","9876543228"],["Adil Hussain","9876543229"],["Rehan Verma","9876543230"],
  ["Shahrukh Ali","9876543231"],["Mohd Arif","9876543232"],["Irfan Khan","9876543233"]
];
const roomBills = {33:900,202:1050,203:850,204:900,205:1100,206:950,207:1000,208:875};
const roomsSeed = Object.keys(roomBills).map(n=>({id:`room_${n}`,roomNumber:n,capacity:3,type:"shared",monthlyRent:7500}));
function seedData(){
  const tenants = [];
  names.forEach((n,i)=>{
    const roomNo = roomsSeed[Math.floor(i/3)].roomNumber;
    tenants.push({
      id:`tenant_${String(i+1).padStart(3,"0")}`, name:n[0], phone:"+91 "+n[1],
      roomId:`room_${roomNo}`, monthlyRent:2500, joiningDate:"2025-08-12"
    });
  });
  const bills=[];
  ["2026-08","2026-09","2026-10"].forEach(month=>{
    roomsSeed.forEach(r=>{
      const base=roomBills[r.roomNumber];
      const factor=month==="2026-08"?.92:month==="2026-09"?.96:1;
      bills.push({id:`electricity_${r.roomNumber}_${month}`,roomId:r.id,month,totalBill:Math.round(base*factor)});
    });
  });
  const payments=[];
  tenants.forEach((t,i)=>{
    const month="2026-10";
    const rentState=[0,2500,2500,2500,1000,2500,0,2500,1500,0,2500,2500][i%12];
    if(rentState) payments.push({id:`p_r_${i}`,tenantId:t.id,roomId:t.roomId,type:"rent",month,amount:rentState,date:"2026-10-"+String(5+(i%12)).padStart(2,"0"),mode:i%2?"Cash":"UPI",note:""});
    const share=Math.round(roomBills[roomsSeed[Math.floor(i/3)].roomNumber]/3);
    const eleState=[0,share,Math.floor(share/2),share,0,Math.floor(share*.65),share,0,Math.floor(share/2),share,0,share][i%12];
    if(eleState) payments.push({id:`p_e_${i}`,tenantId:t.id,roomId:t.roomId,type:"electricity",month,amount:eleState,date:"2026-10-"+String(6+(i%10)).padStart(2,"0"),mode:i%2?"UPI":"Cash",note:""});
  });
  // Add a few older-month payments for history.
  tenants.slice(0,8).forEach((t,i)=>{
    payments.push({id:`old_${i}`,tenantId:t.id,roomId:t.roomId,type:"rent",month:"2026-09",amount:2500,date:"2026-09-"+String(5+i).padStart(2,"0"),mode:"UPI",note:""});
    payments.push({id:`old_e_${i}`,tenantId:t.id,roomId:t.roomId,type:"electricity",month:"2026-09",amount:Math.round((roomBills[201+Math.floor(i/3)]*.96)/3),date:"2026-09-"+String(10+i).padStart(2,"0"),mode:"Cash",note:""});
  });
  return {
    settings:{...DEFAULTS},
    admin:{name:"Admin",phone:"+91 98765 43210",email:""},
    hostel:{name:"HS Height",address:"Near Integral University\nKursi Road, Lucknow, Uttar Pradesh\n226026",ownerName:"Mohd Gulfam",contact:"+91 98765 43210",defaultRoomRent:7500,defaultTenantRent:2500,roomCapacity:3,notes:""},
    rooms:roomsSeed, tenants, electricityBills:bills, payments,
    reminders:[]
  };
}
function loadData(){
  const raw=localStorage.getItem(KEY);
  if(!raw){const d=seedData(); localStorage.setItem(KEY,JSON.stringify(d)); return d;}
  try{
    const d=JSON.parse(raw);
    delete d.complaints;
    const firstRoom=d.rooms?.find(r=>String(r.roomNumber)==="201");
    if(firstRoom) firstRoom.roomNumber="33";
    return d;
  }catch(e){const d=seedData(); localStorage.setItem(KEY,JSON.stringify(d)); return d;}
}
function saveData(){localStorage.setItem(KEY,JSON.stringify(DATA))}
let DATA = loadData();
