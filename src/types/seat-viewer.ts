export interface RegistrationDataItem {
  date: string;
  registration: string;
  ontime: string | number;
}

export interface AircraftDetails {
  aircraftType: string;
  variant: string;
  config: any;
  note: string;
  color: string;
}

export interface OnTimeStatus {
  color: string;
  text: string;
}

export interface VariantConfig {
  variant: string;
  config: any;
  note: string;
  color: string;
}

export interface AircraftConfig {
  [aircraftType: string]: VariantConfig[];
}

export interface SeatData {
  tail_number_distribution: {
    [registration: string]: any;
  };
  configs_by_type?: AircraftConfig;
  configurations_by_type?: AircraftConfig;
}

export interface VariantStats {
  variant: string;
  count: number;
  percentage: number;
  aircraftType: string;
  note: string;
  color: string;
}

export interface TimeAnalysis {
  label: string;
  percentage: number;
  flights: number;
  totalFlights: number;
}

export interface AirlineOption {
  value: string;
  label: string;
  flag?: string;
}

export interface RegistrationCalendarProps {
  registrationData: RegistrationDataItem[];
  airline: string;
  flightNumber: string;
  seatData: SeatData | null;
}

export interface VariantAnalysisProps {
  registrationData: RegistrationDataItem[];
  airline: string;
  seatData: SeatData | null;
}

export interface DelayAnalysisProps {
  registrationData: RegistrationDataItem[];
}

export interface SeatMapTooltipProps {
  airline: string;
  variant: string;
  children: React.ReactNode;
  aircraftType?: string;
}

export interface VariantChange {
  date: string;
  variant: string;
}

export interface VariantObject {
  default?: string;
  changes?: VariantChange[];
}