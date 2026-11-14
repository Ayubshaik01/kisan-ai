export type Region = { state: string; districts: string[] };

/** District lists for the initial coverage area. Verified advisory records are not yet installed for any district. */
export const regions: Region[] = [
  { state: "Andhra Pradesh", districts: ["Guntur", "Krishna", "Prakasam", "East Godavari", "West Godavari", "Kurnool", "Nellore"] },
  { state: "Telangana", districts: ["Khammam", "Warangal", "Nalgonda", "Suryapet", "Karimnagar", "Nizamabad", "Mahabubnagar"] },
];

export const verifiedDistricts: string[] = [];
