import seed from './equipment.json';

export const seedEquipment = seed;
export const statuses = {
  unknown: { label: 'غير محددة', tone: 'muted' },
  operational: { label: 'تعمل', tone: 'good' },
  out_of_service: { label: 'خارج الخدمة', tone: 'bad' },
  maintenance: { label: 'تحت الصيانة', tone: 'warn' },
};
export const typeLabels = { machine: 'ماكينة', crane: 'ونش' };
