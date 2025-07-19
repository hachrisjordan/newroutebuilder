export interface AircraftConfig {
  id: string;
  airline: string;
  type: string;
  variant: string;
  config: string;
  note: string;
  color: string;
}

export interface TailNumber {
  id: string;
  airline: string;
  tail: string;
  type: string;
  variant: string;
  name: string;
  effective_date: string;
  end_date: string;
}

export interface AircraftType {
  airline: string;
  type: string;
  variants: AircraftConfig[];
}

export interface AdminUser {
  id: string;
  role: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
} 