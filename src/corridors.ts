// The 5 busiest Manhattan bus routes that genuinely run in a dedicated bus-only lane.
// "coverage" = % of the GTFS route within 30 m of a DOT bus lane (spatial overlap).
// speeds = weekday mileage-weighted mph (before vs after the lane); trip minutes = route length / speed.

export type Corridor = {
  id: number;
  code: string;
  name: string;
  street: string;
  ridersM: number;        // 2024 ridership (usage), millions
  coverage: number;       // % of route in a bus lane
  install: number;        // bus-lane install year
  installLabel: string;
  lengthKm: number;
  speedBefore: number;
  speedAfter: number;
  tripBefore: number;     // minutes end-to-end
  tripAfter: number;
  savedMin: number;
  riders: number[];       // annual ridership (M) 2018..2024
  ridersChg: number;      // % change 2018 -> 2024
  center: [number, number];
  zoom: number;
  color: [number, number, number];
};

export const RIDER_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

export const CORRIDORS: Corridor[] = [
  { id: 1, code: 'M15', name: 'M15 · 1st/2nd Ave', street: '1st & 2nd Avenue',
    ridersM: 12.0, coverage: 79, install: 2010, installLabel: '2010 (SBS)', lengthKm: 13.9,
    speedBefore: 6.85, speedAfter: 6.99, tripBefore: 75.9, tripAfter: 74.4, savedMin: 1.5, riders: [8.99,12.81,4.02,7.44,11.19,12.10,12.00], ridersChg: 33.5,
    center: [-73.9732, 40.7527], zoom: 11.6, color: [31, 119, 180] },
  { id: 2, code: 'M14', name: 'M14 · 14th St Busway', street: '14th Street',
    ridersM: 8.35, coverage: 61, install: 2019, installLabel: '2019 (busway)', lengthKm: 5.8,
    speedBefore: 4.75, speedAfter: 6.04, tripBefore: 45.4, tripAfter: 35.7, savedMin: 9.7, riders: [6.46,5.77,2.64,5.07,7.39,8.01,8.35], ridersChg: 29.3,
    center: [-73.9916, 40.7265], zoom: 13.3, color: [214, 39, 40] },
  { id: 3, code: 'M101', name: 'M101 · Lex/3rd Ave', street: 'Lexington & 3rd Avenue',
    ridersM: 5.99, coverage: 55, install: 2019, installLabel: '2019 (offset lanes)', lengthKm: 17.6,
    speedBefore: 5.95, speedAfter: 6.19, tripBefore: 110.2, tripAfter: 105.9, savedMin: 4.3, riders: [5.09,6.82,2.69,4.75,6.10,6.18,5.99], ridersChg: 17.7,
    center: [-73.9573, 40.7939], zoom: 11.3, color: [148, 103, 189] },
  { id: 4, code: 'M23', name: 'M23 · 23rd St', street: '23rd Street',
    ridersM: 3.23, coverage: 68, install: 2016, installLabel: '2016 (SBS)', lengthKm: 4.0,
    speedBefore: 4.70, speedAfter: 5.61, tripBefore: 31.4, tripAfter: 26.3, savedMin: 5.1, riders: [3.07,3.80,1.22,1.72,2.62,3.06,3.23], ridersChg: 5.2,
    center: [-73.9915, 40.7415], zoom: 13.0, color: [211, 47, 138] },
  { id: 5, code: 'M96', name: 'M96 · 96th St', street: '96th Street',
    ridersM: 3.09, coverage: 62, install: 2016, installLabel: '2016 (bus lanes)', lengthKm: 3.1,
    speedBefore: 5.79, speedAfter: 5.23, tripBefore: 19.8, tripAfter: 21.9, savedMin: -2.1, riders: [3.61,4.08,1.31,2.21,2.93,2.95,3.09], ridersChg: -14.4,
    center: [-73.9594, 40.7901], zoom: 13.3, color: [255, 127, 14] },
];

export const pct = (a: number, b: number) => ((b - a) / a) * 100;
