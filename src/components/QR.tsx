/**
 * QR — code scannable, sur fond blanc arrondi (contraste garanti à la lecture).
 * Sert à la carte membre et à chaque réservation. La valeur encodée est un
 * identifiant JDS (carte : JDS-MB-<id> · réservation : JDS-BK-<id>).
 */
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export function QR({ value, size = 172 }: { value: string; size?: number }) {
  return (
    <View style={styles.box}>
      <QRCode value={value} size={size} color="#14101c" backgroundColor="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#fff', borderRadius: 18, padding: 14, alignSelf: 'center' },
});
