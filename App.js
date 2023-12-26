import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Dimensions } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useState, useEffect } from 'react';
import { AntDesign } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'


export default function App() {
  const [db, setDb] = useState(SQLite.openDatabase('example.db'));
  const [isLoading, setIsLoading] = useState(true);
  const [names, setNames] = useState([]);
  const [currentName, setCurrentName] = useState('');

  const exportDb = async () => {
    await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/example.db')
  }

  const importDb = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true
    })

    if(result.type === "success"){
      setIsLoading(true)
      if(!(await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'SQLite')).exists) {
        await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory+'SQLite')
      }
      const base64 = await FileSystem.readAsStringAsync(
        result.uri,
        {
          encoding: FileSystem.EncodingType.Base64
        }
      )
      await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'SQLite/example.db', base64, {encoding:FileSystem.EncodingType.Base64})
      await db.closeAsync()
      setDb(SQLite.openDatabase('example.db'))
    }
  }

  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)'
      );
    });

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM names',
        null,
        (txObj, resultSet) => setNames(resultSet.rows._array),
        (txObj, err) => console.log(err)
      );
    });

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading names...</Text>
      </View>
    );
  }

  const addName = () => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO names (name) values (?)',
        [currentName],
        (txObj, resultSet) => {
          let existingNames = [...names];
          existingNames.push({
            id: resultSet.insertId,
            name: currentName,
          });
          setNames(existingNames);
          setCurrentName(''); // Clear input after adding name
        },
        (txObj, err) => console.log(err)
      );
    });
  };  

  const deleteName = (id) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM names WHERE id = ?', [id],
        (txObj, res) => {
          if(res.rowsAffected > 0) {
            let existingNames = [...names].filter(name => name.id !== id)
            setNames(existingNames)
          }
        },
        (txObj, err) => console.log(err)
      )
    })
  }

  const updateName = (id) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE names SET name = ? where id = ?', [currentName, id],
        (txObj, res) => {
          if(res.rowsAffected > 0){
            let existingNames = [...names]
            const indexToUpdate = existingNames.findIndex(name => name.id === id)
            existingNames[indexToUpdate].name = currentName;
            setNames(existingNames)
            setCurrentName(undefined)
          }
        },
        (txObj, err) => console.log(err)
      )
    })
  }

  const showNames = () => {
    return names.map((name, index) => (
      <View key={index} style={styles.row}>
        <Text>{name.name}</Text>
        <View style={styles.buttons}>
          <Button style={styles.button} title='Delete' onPress={() => deleteName(name.id)} />
          <View style={{ width: 4 }}></View>
          <Button style={styles.button} title='Update' onPress={() => updateName(name.id)} />
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.input}>

        <TextInput
          style={styles.textInput}
          value={currentName}
          placeholder='Enter a name...'
          onChangeText={text => setCurrentName(text)}
        />

        <Button title='Add Name' onPress={addName} />
      </View>

      <View style={styles.row}>
        <Text style={styles.title}>Names</Text>
        <View style={styles.mbuttons}>
          <Button style={styles.button} title='Export Db' onPress={exportDb} />
          <Button style={styles.button} title='Import Db' onPress={importDb}  />
        </View>
      </View>
      <View style={{ width: Dimensions.get('window').width, borderBottomWidth: 1 }}></View>
      {showNames()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    flexDirection: 'column'
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    margin: 8,
  },
  
  mbuttons: {
    flexDirection: 'row',
    width: Dimensions.get('window').width * 0.45,
    justifyContent: 'space-between'
  },

  buttons: {
    flexDirection: 'row',
  },

  button: {
    margin: 4
  },

  input: {
    flexDirection: 'row',
    width: Dimensions.get('window').width,
    justifyContent: 'space-between',
    padding: 10
  },

  textInput: {
    width: Dimensions.get('screen').width * 0.7,
    borderWidth: 0.5,
    borderRadius: 5,
    padding: 4,
    fontSize: 18
  },

  title: {
    // width: Dimensions.get('window').width,
    fontSize: 22,
    textAlign: 'center',
    textTransform: 'uppercase',
    color: 'skyblue',
    borderBottomWidth: 0.5,
    marginBottom: 4,
    fontWeight: 'bold',
  }
});
