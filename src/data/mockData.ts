export interface SterilizationRecord {
  id: string;
  timestamp: string;
  date: string;
  unit: string;
  temperature: number;
  sterilizationTime: number | null;
  dryingTime: number | null;
  externalIndicator: 'ผ่าน' | 'ไม่ผ่าน' | '-';
  internalIndicator: 'ผ่าน' | 'ไม่ผ่าน' | '-';
  biologicalIndicator: 'ผ่าน' | 'ไม่ผ่าน' | '-';
  reader1: string;
  reader2: string;
}

const unitNames = [
  "1.บ้านไม้งาม", "2.บ้านหนองนกปีกกา", "3.บ้านมูเซอ", "4.บ้านหนองแขม", "5.บ้านลานสาง",
  "6.บ้านคลองขยางโพรง", "7.บ้านเกาะอ้ายด้วน", "8.บ้านลานห้วยเดื่อ", "9.บ้านปากห้วยแม่ท้อ", "10.บ้านโป่งแค",
  "11.บ้านวังประจบ", "12.ห้วยเหลือง", "13.บ้านชะลาดระฆัง", "14.บ้านน้ำโจน", "15.หนองปรือ",
  "16.บ้านชะลาด", "17.บ้านลานสอ", "18.บ้านท่าไม้แดง", "19.บ้านโป่งแดง", "20.บ้านปากห้วยไม้งาม",
  "21.บ้านสระตลุง", "22.ห้อง LAB รพ.ตสม"
];

const readers = ["ณัฐวุฒิ", "ธนกฤต", "นันทวัฒน์", "ภูผา", "ศรัณยู", "อาทิตย์", "ชัยกร", "สราวุฒิ"];

let seed = 1;
const random = () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const generateMockData = (): SterilizationRecord[] => {
  const data: SterilizationRecord[] = [];
  let idCounter = 1;

  for (let month = 1; month <= 5; month++) {
    for (const unit of unitNames) {
      const recordsCount = Math.floor(random() * 4) + 2;
      for (let i = 0; i < recordsCount; i++) {
        const day = Math.floor(random() * 28) + 1;
        const hour = Math.floor(random() * 8) + 8;
        const minute = Math.floor(random() * 60);
        const second = Math.floor(random() * 60);
        
        const timestamp = `${day}/${month}/2026 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
        const date = `${day}/${month}/2026`;
        
        const isFailInt = random() < 0.05;
        const isFailBio = random() < 0.02;

        data.push({
          id: `REC-${idCounter.toString().padStart(4, '0')}`,
          timestamp,
          date,
          unit,
          temperature: random() > 0.1 ? 121 : (random() > 0.5 ? 132 : 134),
          sterilizationTime: random() > 0.5 ? 45 : 60,
          dryingTime: random() > 0.2 ? 30 : (random() > 0.5 ? 20 : null),
          externalIndicator: 'ผ่าน',
          internalIndicator: isFailInt ? 'ไม่ผ่าน' : 'ผ่าน',
          biologicalIndicator: isFailBio ? 'ไม่ผ่าน' : 'ผ่าน',
          reader1: readers[Math.floor(random() * readers.length)],
          reader2: readers[Math.floor(random() * readers.length)]
        });
        idCounter++;
      }
    }
  }
  
  return data.sort((a, b) => {
    const parseDate = (d: string) => {
      const parts = d.split(' ')[0].split('/');
      return new Date(2026, parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
    }
    return parseDate(b.timestamp) - parseDate(a.timestamp); 
  });
};

export const mockData: SterilizationRecord[] = generateMockData();
