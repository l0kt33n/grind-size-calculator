import { mapMicronsToSetting, queryMicrons } from './grinder-utils';
import { SettingFormat, Grinder } from '@/types/grinder';
import grinderData from '../../public/grinderData.json';

// Get all 1Zpresso grinders
const oneZpressoGrinders = grinderData.grinders.filter(g => g.name.toLowerCase().includes('1zpresso')) as Grinder[];
if (oneZpressoGrinders.length === 0) throw new Error('No 1Zpresso grinders found in grinderData.json');

describe('mapMicronsToSetting', () => {
  describe('complex settings', () => {
    // Test each 1Zpresso grinder
    oneZpressoGrinders.forEach(grinder => {
      describe(`1Zpresso ${grinder.name} (${grinder.clicks_per_number} clicks per number)`, () => {
        // Get V60 method for this grinder
        const v60Method = grinder.brew_methods.find(m => m.method_name === 'V60');
        if (!v60Method) {
          console.warn(`V60 method not found for ${grinder.name}`);
          return;
        }
        if (!v60Method.start_setting || !v60Method.end_setting || 
            v60Method.start_microns === null || v60Method.end_microns === null) {
          console.warn(`V60 method settings or microns are null for ${grinder.name}`);
          return;
        }

        const startMicrons = v60Method.start_microns;
        const endMicrons = v60Method.end_microns;
        const startSetting = v60Method.start_setting;
        const endSetting = v60Method.end_setting;

        it('should correctly map start microns to start setting', () => {
          const result = mapMicronsToSetting(
            startMicrons,
            startSetting,
            endSetting,
            startMicrons,
            endMicrons,
            v60Method.setting_format as SettingFormat,
            grinder.clicks_per_number
          );
          
          expect(result).toBe(startSetting);
        });

        it('should correctly map end microns to end setting', () => {
          const result = mapMicronsToSetting(
            endMicrons,
            startSetting,
            endSetting,
            startMicrons,
            endMicrons,
            v60Method.setting_format as SettingFormat,
            grinder.clicks_per_number
          );
          
          expect(result).toBe(endSetting);
        });

        it('should correctly map middle microns', () => {
          const middleMicrons = (startMicrons + endMicrons) / 2;
          const result = mapMicronsToSetting(
            middleMicrons,
            startSetting,
            endSetting,
            startMicrons,
            endMicrons,
            v60Method.setting_format as SettingFormat,
            grinder.clicks_per_number
          );
          
          // The result should be between start and end settings
          expect(result).not.toBeNull();
          if (result && typeof result === 'string') {
            const [startRotations, startNumbers, startClicks] = startSetting.split('.').map(Number);
            const [endRotations, endNumbers, endClicks] = endSetting.split('.').map(Number);
            const [resultRotations, resultNumbers, resultClicks] = result.split('.').map(Number);
            
            // Check if result is between start and end settings
            const startValue = startRotations * 100 + startNumbers * 10 + startClicks;
            const endValue = endRotations * 100 + endNumbers * 10 + endClicks;
            const resultValue = resultRotations * 100 + resultNumbers * 10 + resultClicks;
            
            expect(resultValue).toBeGreaterThanOrEqual(startValue);
            expect(resultValue).toBeLessThanOrEqual(endValue);
          }
        });
      });
    });
  });
});

describe('queryMicrons', () => {
  it('should correctly calculate settings for Q2 S V60 at 400 microns', async () => {
    const result = await queryMicrons({
      grinderName: '1zpresso Q2 S',
      targetMicrons: 400,
      brewMethod: 'V60'
    });

    // Debug logging
    console.log('Test debug:', {
      grinder: result.grinder.name,
      targetMicrons: result.target_microns,
      calculatedSetting: result.calculated_setting,
      settingFormat: result.setting_format,
      clicksPerNumber: result.grinder.clicks_per_number,
      matchingMethods: result.matching_methods.map(m => ({
        name: m.method_name,
        start: m.start_setting,
        end: m.end_setting,
        startMicrons: m.start_microns,
        endMicrons: m.end_microns
      }))
    });

    expect(result.calculated_setting).toBe('1.2.0');
  });
}); 