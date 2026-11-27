import { View } from 'react-native';
import { router } from 'expo-router';
import { Button } from 'react-native-paper';
import { ExerciseList } from '@/components/ExerciseList';
import { BASE } from '@/theme';

export default function Library() {
  return (
    <View style={{ flex: 1, backgroundColor: BASE.background, paddingHorizontal: 12 }}>
      <ExerciseList
        onPress={(ex) => router.push(`/exercise/${ex.id}`)}
        header={
          <Button mode="text" icon="plus" onPress={() => router.push('/exercise-edit')} style={{ alignSelf: 'flex-start' }}>
            Create custom exercise
          </Button>
        }
      />
    </View>
  );
}
