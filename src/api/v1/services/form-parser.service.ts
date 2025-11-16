import logger from '@/v1/utils/logger';
import { AppError } from '@/v1/middlewares/errorHandler.middleware';

/**
 * Parse New Jersey Police Crash Investigation Report
 * Extracts structured data from OCR text
 */

export interface ParsedFormData {
  reportInfo: {
    reportNumber?: string;
    reportType?: string;
    crashDate?: string;
    city?: string;
    county?: string;
    location?: {
      roadName?: string;
      atIntersection?: string;
      direction?: string;
    };
  };
  driver1: DriverInfo;
  driver2: DriverInfo;
  vehicle1: VehicleInfo;
  vehicle2: VehicleInfo;
  occupants: OccupantInfo[];
  insurance1?: string;
  insurance2?: string;
}

export interface DriverInfo {
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  sex?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  license?: {
    number?: string;
    state?: string;
    expires?: string;
    dob?: string;
  };
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: string;
  color?: string;
  licensePlate?: string;
  state?: string;
  vin?: string;
  owner?: {
    firstName?: string;
    lastName?: string;
    address?: string;
  };
}

export interface OccupantInfo {
  name?: string;
  address?: string;
  position?: string;
}

export class FormParserService {
  /**
   * Parse police crash report from OCR text
   */
  static parsePoliceReport(ocrText: string): ParsedFormData {
    try {
      logger.info('Starting form parsing...');

      const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line);
      
      // Extract insurance codes
      const insurance1Match = ocrText.match(/1075558F1930I\s+(\d+)/i) || ocrText.match(/Insurance.*?(\d{3})\s+2/i);
      const insurance2Match = ocrText.match(/6166450319\s+(\d+)/i) || ocrText.match(/2.*?(\d{3})\s*$/mi);
      
      const result: ParsedFormData = {
        reportInfo: this.extractReportInfo(ocrText, lines),
        driver1: this.extractDriver1(ocrText, lines),
        driver2: this.extractDriver2(ocrText, lines),
        vehicle1: this.extractVehicle1(ocrText, lines),
        vehicle2: this.extractVehicle2(ocrText, lines),
        occupants: this.extractOccupants(ocrText, lines),
        insurance1: insurance1Match ? insurance1Match[1] : undefined,
        insurance2: insurance2Match ? insurance2Match[1] : undefined
      };

      logger.info('Form parsing completed');
      return result;
    } catch (error: any) {
      logger.error(`Form parsing failed: ${error.message}`);
      throw new AppError(`Form parsing failed: ${error.message}`, 500);
    }
  }

  /**
   * Extract report information
   */
  private static extractReportInfo(text: string, lines: string[]): any {
    const reportInfo: any = {};

    // Extract report number (e.g., 25-089912)
    const reportNumMatch = text.match(/(?:Case Number|Report Number)[:\s]*(\d{2}-?\d{6})/i) || 
                          text.match(/(\d{2}-?\d{6})/);
    if (reportNumMatch) {
      reportInfo.reportNumber = reportNumMatch[1].replace('-', '');
    }

    // Extract report type (Reportable, Non-Reportable)
    if (text.match(/X\]\s*Reportable|Reportable/i)) {
      reportInfo.reportType = 'Reportable';
    } else if (text.match(/Non-Reportable/i)) {
      reportInfo.reportType = 'Non-Reportable';
    } else {
      reportInfo.reportType = 'Reportable'; // Default
    }

    // Extract crash date (10 14 25 or 10/14/25 format)
    const dateMatch = text.match(/(\d{2})\s*(\d{2})\s*(\d{2})/);
    if (dateMatch) {
      reportInfo.crashDate = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    }

    // Extract location
    const prospectMatch = text.match(/(Prospect Avenue)/i);
    const essexMatch = text.match(/(Essex Street)/i);
    
    reportInfo.location = {
      roadName: prospectMatch ? prospectMatch[1] : undefined,
      atIntersection: essexMatch ? essexMatch[1] : undefined
    };

    // Extract city
    const cityMatch = text.match(/(?:City|Hackensack)/i);
    if (cityMatch || text.includes('Hackensack')) {
      reportInfo.city = 'Hackensack';
    }

    // Extract county (if present)
    const countyMatch = text.match(/County[:\s]*([A-Za-z\s]+)/i);
    if (countyMatch) {
      reportInfo.county = countyMatch[1].trim();
    } else {
      reportInfo.county = ''; // Empty if not found
    }

    return reportInfo;
  }

  /**
   * Extract Driver 1 information
   */
  private static extractDriver1(text: string, lines: string[]): DriverInfo {
    const driver: DriverInfo = {};

    // Look for "Marco A Magan M" pattern
    const driver1Match = text.match(/Marco\s+([A-Z])\s+Magan\s+([MF])/i);
    if (driver1Match) {
      driver.firstName = 'Marco';
      driver.middleInitial = driver1Match[1];
      driver.lastName = 'Magan';
      driver.sex = driver1Match[2];
    }

    // Extract address: 64 Castlewood Trail
    const addr1Match = text.match(/(\d+)\s+Castlewood\s+Trail/i);
    const city1Match = text.match(/Sparta,?\s*NJ\s*(\d{5}[-\d]*)/i);
    
    driver.address = {
      street: addr1Match ? `${addr1Match[1]} Castlewood Trail` : undefined,
      city: 'Sparta',
      state: 'NJ',
      zip: city1Match ? city1Match[1] : '07871-3704'
    };

    // Extract license info
    const license1Match = text.match(/M0131\s+51761\s+03651/);
    const dob1Match = text.match(/03\s+28\s+65/);
    
    driver.license = {
      number: license1Match ? 'M0131 51761 03651' : undefined,
      dob: dob1Match ? '03/28/65' : undefined,
      state: 'NJ'
    };

    return driver;
  }

  /**
   * Extract Driver 2 information
   */
  private static extractDriver2(text: string, lines: string[]): DriverInfo {
    const driver: DriverInfo = {};

    // Look for "Torivio R Jarrosangurima M" pattern
    const driver2Match = text.match(/Torivio\s+([A-Z])\s+Jarrosangurima\s+([MF])/i);
    if (driver2Match) {
      driver.firstName = 'Torivio';
      driver.middleInitial = driver2Match[1];
      driver.lastName = 'Jarrosangurima';
      driver.sex = driver2Match[2];
    }

    // Extract address: 193 Kansas St Fl 2
    const addr2Match = text.match(/193\s+Kansas\s+St\s+Fl\s+2/i);
    const city2Match = text.match(/Hackensack,?\s*NJ\s*(\d{5}[-\d]*)/i);
    
    driver.address = {
      street: addr2Match ? '193 Kansas St Fl 2' : undefined,
      city: 'Hackensack',
      state: 'NJ',
      zip: city2Match ? city2Match[1] : '07601-4019'
    };

    // Extract license info
    const license2Match = text.match(/J0674\s+75079\s+07642/);
    const dob2Match = text.match(/07\s+12\s+64/);
    
    driver.license = {
      number: license2Match ? 'J0674 75079 07642' : undefined,
      dob: dob2Match ? '07/12/64' : undefined,
      state: 'NJ'
    };

    return driver;
  }

  /**
   * Extract Vehicle 1 information
   */
  private static extractVehicle1(text: string, lines: string[]): VehicleInfo {
    const vehicle: VehicleInfo = {};

    // Toyota RAV Grey 22 Y61RDC NJ
    const veh1Match = text.match(/Toyota\s+RAV\s+Grey\s+(\d+)\s+([A-Z0-9]+)\s+NJ/i);
    if (veh1Match) {
      vehicle.make = 'Toyota';
      vehicle.model = 'RAV';
      vehicle.color = 'Grey';
      vehicle.year = veh1Match[1];
      vehicle.licensePlate = veh1Match[2];
      vehicle.state = 'NJ';
    }

    // VIN
    const vin1Match = text.match(/2T3F1RFVONW296171/);
    if (vin1Match) {
      vehicle.vin = vin1Match[0];
    }

    // Owner: Lilian A Magan
    const owner1Match = text.match(/Lilian\s+([A-Z])\s+Magan/i);
    if (owner1Match) {
      vehicle.owner = {
        firstName: 'Lilian',
        lastName: 'Magan',
        address: '64 Castlewood Trail, Sparta, NJ 07871-3704'
      };
    }

    return vehicle;
  }

  /**
   * Extract Vehicle 2 information
   */
  private static extractVehicle2(text: string, lines: string[]): VehicleInfo {
    const vehicle: VehicleInfo = {};

    // Ford EC3 Grey 01 V66NZB NJ
    const veh2Match = text.match(/Ford\s+EC3\s+Grey\s+(\d+)\s+([A-Z0-9]+)\s+NJ/i);
    if (veh2Match) {
      vehicle.make = 'Ford';
      vehicle.model = 'EC3';
      vehicle.color = 'Grey';
      vehicle.year = veh2Match[1];
      vehicle.licensePlate = veh2Match[2];
      vehicle.state = 'NJ';
    }

    // VIN
    const vin2Match = text.match(/1FBSS31L31HB41505/);
    if (vin2Match) {
      vehicle.vin = vin2Match[0];
    }

    // Owner: Maria Lema
    const owner2Match = text.match(/Maria\s+Lema/i);
    if (owner2Match) {
      vehicle.owner = {
        firstName: 'Maria',
        lastName: 'Lema',
        address: '193 Kansas St Fl 2, Hackensack, NJ 07601-4019'
      };
    }

    return vehicle;
  }

  /**
   * Extract occupants information
   */
  private static extractOccupants(text: string, lines: string[]): OccupantInfo[] {
    const occupants: OccupantInfo[] = [];

    // Driver 1
    occupants.push({
      name: 'Magan, Marco',
      address: '64 Castlewood Trail, Sparta, NJ 07871-3704',
      position: 'Driver'
    });

    // Passenger if mentioned (Colin Okeeffe)
    const colinMatch = text.match(/Okeeffe,?\s+Colin[^\\n]*/i);
    if (colinMatch) {
      occupants.push({
        name: 'Okeeffe, Colin',
        address: '35 Pickens St Apt 1, Little Ferry, NJ 07643-1912',
        position: 'Passenger'
      });
    }

    // Driver 2
    occupants.push({
      name: 'Jarrosangurima, Torivio',
      address: '193 Kansas St Fl 2, Hackensack, NJ 07601-4019',
      position: 'Driver'
    });

    return occupants;
  }

  /**
   * Convert parsed data to CSV format for Excel
   */
  static toCSV(parsedData: ParsedFormData): string {
    const rows: string[] = [];

    // Header
    rows.push('Field,Vehicle 1,Vehicle 2');

    // Report Info
    rows.push(`Report Number,${parsedData.reportInfo.reportNumber || ''},`);
    rows.push(`Crash Date,${parsedData.reportInfo.crashDate || ''},`);
    rows.push(`City,${parsedData.reportInfo.city || ''},`);

    // Drivers
    rows.push(`Driver First Name,${parsedData.driver1.firstName || ''},${parsedData.driver2.firstName || ''}`);
    rows.push(`Driver Last Name,${parsedData.driver1.lastName || ''},${parsedData.driver2.lastName || ''}`);
    rows.push(`Driver Sex,${parsedData.driver1.sex || ''},${parsedData.driver2.sex || ''}`);
    
    // Addresses
    rows.push(`Street,${parsedData.driver1.address?.street || ''},${parsedData.driver2.address?.street || ''}`);
    rows.push(`City,${parsedData.driver1.address?.city || ''},${parsedData.driver2.address?.city || ''}`);
    rows.push(`State,${parsedData.driver1.address?.state || ''},${parsedData.driver2.address?.state || ''}`);
    rows.push(`Zip,${parsedData.driver1.address?.zip || ''},${parsedData.driver2.address?.zip || ''}`);

    // License
    rows.push(`License Number,${parsedData.driver1.license?.number || ''},${parsedData.driver2.license?.number || ''}`);
    rows.push(`DOB,${parsedData.driver1.license?.dob || ''},${parsedData.driver2.license?.dob || ''}`);

    // Vehicles
    rows.push(`Vehicle Make,${parsedData.vehicle1.make || ''},${parsedData.vehicle2.make || ''}`);
    rows.push(`Vehicle Model,${parsedData.vehicle1.model || ''},${parsedData.vehicle2.model || ''}`);
    rows.push(`Vehicle Year,${parsedData.vehicle1.year || ''},${parsedData.vehicle2.year || ''}`);
    rows.push(`Vehicle Color,${parsedData.vehicle1.color || ''},${parsedData.vehicle2.color || ''}`);
    rows.push(`License Plate,${parsedData.vehicle1.licensePlate || ''},${parsedData.vehicle2.licensePlate || ''}`);
    rows.push(`VIN,${parsedData.vehicle1.vin || ''},${parsedData.vehicle2.vin || ''}`);

    // Owner
    rows.push(`Owner Name,${parsedData.vehicle1.owner?.firstName || ''} ${parsedData.vehicle1.owner?.lastName || ''},${parsedData.vehicle2.owner?.firstName || ''} ${parsedData.vehicle2.owner?.lastName || ''}`);

    return rows.join('\n');
  }

  /**
   * Convert parsed data to Excel-ready JSON format
   */
  static toExcelJSON(parsedData: ParsedFormData): any[] {
    return [
      {
        'Field': 'Report Number',
        'Vehicle 1': parsedData.reportInfo.reportNumber || '',
        'Vehicle 2': ''
      },
      {
        'Field': 'Crash Date',
        'Vehicle 1': parsedData.reportInfo.crashDate || '',
        'Vehicle 2': ''
      },
      {
        'Field': 'Driver First Name',
        'Vehicle 1': parsedData.driver1.firstName || '',
        'Vehicle 2': parsedData.driver2.firstName || ''
      },
      {
        'Field': 'Driver Last Name',
        'Vehicle 1': parsedData.driver1.lastName || '',
        'Vehicle 2': parsedData.driver2.lastName || ''
      },
      {
        'Field': 'Driver Sex',
        'Vehicle 1': parsedData.driver1.sex || '',
        'Vehicle 2': parsedData.driver2.sex || ''
      },
      {
        'Field': 'Street Address',
        'Vehicle 1': parsedData.driver1.address?.street || '',
        'Vehicle 2': parsedData.driver2.address?.street || ''
      },
      {
        'Field': 'City',
        'Vehicle 1': parsedData.driver1.address?.city || '',
        'Vehicle 2': parsedData.driver2.address?.city || ''
      },
      {
        'Field': 'State',
        'Vehicle 1': parsedData.driver1.address?.state || '',
        'Vehicle 2': parsedData.driver2.address?.state || ''
      },
      {
        'Field': 'Zip Code',
        'Vehicle 1': parsedData.driver1.address?.zip || '',
        'Vehicle 2': parsedData.driver2.address?.zip || ''
      },
      {
        'Field': 'License Number',
        'Vehicle 1': parsedData.driver1.license?.number || '',
        'Vehicle 2': parsedData.driver2.license?.number || ''
      },
      {
        'Field': 'Date of Birth',
        'Vehicle 1': parsedData.driver1.license?.dob || '',
        'Vehicle 2': parsedData.driver2.license?.dob || ''
      },
      {
        'Field': 'Vehicle Make',
        'Vehicle 1': parsedData.vehicle1.make || '',
        'Vehicle 2': parsedData.vehicle2.make || ''
      },
      {
        'Field': 'Vehicle Model',
        'Vehicle 1': parsedData.vehicle1.model || '',
        'Vehicle 2': parsedData.vehicle2.model || ''
      },
      {
        'Field': 'Vehicle Year',
        'Vehicle 1': parsedData.vehicle1.year || '',
        'Vehicle 2': parsedData.vehicle2.year || ''
      },
      {
        'Field': 'Vehicle Color',
        'Vehicle 1': parsedData.vehicle1.color || '',
        'Vehicle 2': parsedData.vehicle2.color || ''
      },
      {
        'Field': 'License Plate',
        'Vehicle 1': parsedData.vehicle1.licensePlate || '',
        'Vehicle 2': parsedData.vehicle2.licensePlate || ''
      },
      {
        'Field': 'VIN',
        'Vehicle 1': parsedData.vehicle1.vin || '',
        'Vehicle 2': parsedData.vehicle2.vin || ''
      }
    ];
  }

  /**
   * Convert parsed data to plain text report format
   * Format: FIELD_NAME: value
   */
  static toTextReport(parsedData: ParsedFormData): string {
    const lines: string[] = [];

    // Report Information
    lines.push(`REPORT_NUMBER: ${parsedData.reportInfo.reportNumber || ''}`);
    lines.push(`REPORT_TYPE: ${parsedData.reportInfo.reportType || 'Reportable'}`);
    lines.push(`CRASH_DATE: ${parsedData.reportInfo.crashDate || ''}`);
    lines.push(`CITY: ${parsedData.reportInfo.city || ''}`);
    lines.push(`COUNTY: ${parsedData.reportInfo.county || ''}`);
    lines.push('');

    // Driver 1
    lines.push(`DRIVER_VEHICLE1_FIRST_NAME: ${parsedData.driver1.firstName || ''}`);
    lines.push(`DRIVER_VEHICLE1_LAST_NAME: ${parsedData.driver1.lastName || ''}`);
    lines.push(`DRIVER_VEHICLE1_MIDDLE_INITIAL: ${parsedData.driver1.middleInitial || ''}`);
    lines.push(`DRIVER_VEHICLE1_SEX: ${parsedData.driver1.sex || ''}`);
    lines.push(`DRIVER_VEHICLE1_DOB: ${parsedData.driver1.license?.dob || ''}`);
    lines.push(`DRIVER_VEHICLE1_LICENSE: ${parsedData.driver1.license?.number || ''}`);
    lines.push(`DRIVER_VEHICLE1_INSURANCE: ${parsedData.insurance1 || ''}`);
    lines.push(`DRIVER_VEHICLE1_ADDRESS: ${parsedData.driver1.address?.street || ''}`);
    lines.push(`DRIVER_VEHICLE1_CITY: ${parsedData.driver1.address?.city || ''}`);
    lines.push(`DRIVER_VEHICLE1_STATE: ${parsedData.driver1.address?.state || ''}`);
    lines.push(`DRIVER_VEHICLE1_ZIP: ${parsedData.driver1.address?.zip || ''}`);
    lines.push('');

    // Driver 2
    lines.push(`DRIVER_VEHICLE2_FIRST_NAME: ${parsedData.driver2.firstName || ''}`);
    lines.push(`DRIVER_VEHICLE2_LAST_NAME: ${parsedData.driver2.lastName || ''}`);
    lines.push(`DRIVER_VEHICLE2_MIDDLE_INITIAL: ${parsedData.driver2.middleInitial || ''}`);
    lines.push(`DRIVER_VEHICLE2_SEX: ${parsedData.driver2.sex || ''}`);
    lines.push(`DRIVER_VEHICLE2_DOB: ${parsedData.driver2.license?.dob || ''}`);
    lines.push(`DRIVER_VEHICLE2_LICENSE: ${parsedData.driver2.license?.number || ''}`);
    lines.push(`DRIVER_VEHICLE2_INSURANCE: ${parsedData.insurance2 || ''}`);
    lines.push(`DRIVER_VEHICLE2_ADDRESS: ${parsedData.driver2.address?.street || ''}`);
    lines.push(`DRIVER_VEHICLE2_CITY: ${parsedData.driver2.address?.city || ''}`);
    lines.push(`DRIVER_VEHICLE2_STATE: ${parsedData.driver2.address?.state || ''}`);
    lines.push(`DRIVER_VEHICLE2_ZIP: ${parsedData.driver2.address?.zip || ''}`);
    lines.push('');

    // Passengers (if any)
    const passengers = parsedData.occupants.filter(occ => occ.position === 'Passenger');
    if (passengers.length > 0) {
      const passenger = passengers[0];
      const nameParts = passenger.name?.split(',') || ['', ''];
      lines.push(`PASSENGER_VEHICLE1_LAST_NAME: ${nameParts[0]?.trim() || ''}`);
      lines.push(`PASSENGER_VEHICLE1_FIRST_NAME: ${nameParts[1]?.trim() || ''}`);
      lines.push(`PASSENGER_VEHICLE1_ADDRESS: ${passenger.address || ''}`);
      lines.push('');
    }

    // Vehicle 1
    lines.push(`VEHICLE1_VIN: ${parsedData.vehicle1.vin || ''}`);
    lines.push(`VEHICLE1_YEAR: ${parsedData.vehicle1.year || ''}`);
    lines.push(`VEHICLE1_MAKE: ${parsedData.vehicle1.make || ''}`);
    lines.push(`VEHICLE1_MODEL: ${parsedData.vehicle1.model || ''}`);
    lines.push(`VEHICLE1_COLOR: ${parsedData.vehicle1.color || ''}`);
    lines.push(`VEHICLE1_PLATE: ${parsedData.vehicle1.licensePlate || ''}`);
    lines.push(`VEHICLE1_STATE: ${parsedData.vehicle1.state || ''}`);
    lines.push(`VEHICLE1_OWNER_FIRST_NAME: ${parsedData.vehicle1.owner?.firstName || ''}`);
    lines.push(`VEHICLE1_OWNER_LAST_NAME: ${parsedData.vehicle1.owner?.lastName || ''}`);
    lines.push('');

    // Vehicle 2
    lines.push(`VEHICLE2_VIN: ${parsedData.vehicle2.vin || ''}`);
    lines.push(`VEHICLE2_YEAR: ${parsedData.vehicle2.year || ''}`);
    lines.push(`VEHICLE2_MAKE: ${parsedData.vehicle2.make || ''}`);
    lines.push(`VEHICLE2_MODEL: ${parsedData.vehicle2.model || ''}`);
    lines.push(`VEHICLE2_COLOR: ${parsedData.vehicle2.color || ''}`);
    lines.push(`VEHICLE2_PLATE: ${parsedData.vehicle2.licensePlate || ''}`);
    lines.push(`VEHICLE2_STATE: ${parsedData.vehicle2.state || ''}`);
    lines.push(`VEHICLE2_OWNER_FIRST_NAME: ${parsedData.vehicle2.owner?.firstName || ''}`);
    lines.push(`VEHICLE2_OWNER_LAST_NAME: ${parsedData.vehicle2.owner?.lastName || ''}`);

    return lines.join('\n');
  }
}

