/** Official weekly CORE programme. No dated bookings or availability inferred. */
import type {ImageSourcePropType} from 'react-native';
import programme from './core-open-data.json';
export const coreOpenCourses = programme;
export type CoreOpenCourse = (typeof programme)[number];
const posters: Record<string, ImageSourcePropType> = {
  'core-8383.jpg': require('../../assets/core-open/core-8383.jpg'),
  'core-8384.jpg': require('../../assets/core-open/core-8384.jpg'),
  'core-8385.jpg': require('../../assets/core-open/core-8385.jpg'),
  'core-8386.jpg': require('../../assets/core-open/core-8386.jpg'),
  'core-8387.jpg': require('../../assets/core-open/core-8387.jpg'),
  'core-8388.jpg': require('../../assets/core-open/core-8388.jpg'),
  'core-8389.jpg': require('../../assets/core-open/core-8389.jpg'),
  'core-8390.jpg': require('../../assets/core-open/core-8390.jpg'),
  'core-8391.jpg': require('../../assets/core-open/core-8391.jpg'),
  'core-8392.jpg': require('../../assets/core-open/core-8392.jpg'),
  'core-8393.jpg': require('../../assets/core-open/core-8393.jpg'),
  'core-8394.jpg': require('../../assets/core-open/core-8394.jpg'),
  'core-8395.jpg': require('../../assets/core-open/core-8395.jpg'),
  'core-8396.jpg': require('../../assets/core-open/core-8396.jpg'),
  'core-8397.jpg': require('../../assets/core-open/core-8397.jpg'),
  'core-8398.jpg': require('../../assets/core-open/core-8398.jpg'),
  'core-8399.jpg': require('../../assets/core-open/core-8399.jpg'),
  'core-8400.jpg': require('../../assets/core-open/core-8400.jpg'),
  'core-8401.jpg': require('../../assets/core-open/core-8401.jpg'),
  'core-8402.jpg': require('../../assets/core-open/core-8402.jpg'),
  'core-8403.jpg': require('../../assets/core-open/core-8403.jpg'),
  'core-8404.jpg': require('../../assets/core-open/core-8404.jpg'),
  'core-8405.jpg': require('../../assets/core-open/core-8405.jpg'),
  'core-8406.jpg': require('../../assets/core-open/core-8406.jpg'),
  'core-8407.jpg': require('../../assets/core-open/core-8407.jpg'),
  'core-8408.jpg': require('../../assets/core-open/core-8408.jpg'),
};
export const coreOpenPoster = (course: CoreOpenCourse): ImageSourcePropType => posters[course.poster];
