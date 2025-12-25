import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function CalculatorInput({ value, onChangeText, placeholder, style, ...otherProps }) {
  const { colors } = useContext(ThemeContext);
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);

  const handleNumberPress = (num) => {
    if (calcDisplay === '0') {
      setCalcDisplay(num);
    } else {
      setCalcDisplay(calcDisplay + num);
    }
  };

  const handleDecimalPress = () => {
    if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.');
    }
  };

  const handleOperationPress = (op) => {
    setPrevValue(parseFloat(calcDisplay));
    setOperation(op);
    setCalcDisplay('0');
  };

  const handleEquals = () => {
    if (prevValue !== null && operation) {
      const current = parseFloat(calcDisplay);
      let result = 0;
      
      switch (operation) {
        case '+':
          result = prevValue + current;
          break;
        case '-':
          result = prevValue - current;
          break;
        case '*':
        case '×':
          result = prevValue * current;
          break;
        case '/':
        case '÷':
          result = current !== 0 ? prevValue / current : 0;
          break;
      }
      
      setCalcDisplay(result.toString());
      setPrevValue(null);
      setOperation(null);
    }
  };

  const handleClear = () => {
    setCalcDisplay('0');
    setPrevValue(null);
    setOperation(null);
  };

  const handleDelete = () => {
    if (calcDisplay.length > 1) {
      setCalcDisplay(calcDisplay.slice(0, -1));
    } else {
      setCalcDisplay('0');
    }
  };

  const handleDone = () => {
    onChangeText(calcDisplay);
    setShowCalc(false);
    setCalcDisplay('0');
    setPrevValue(null);
    setOperation(null);
  };

  const CalcButton = ({ label, onPress, span = 1, type = 'default' }) => {
    let bgColor = colors.surface;
    let textColor = colors.text;
    
    if (type === 'operation') {
      bgColor = colors.accent;
      textColor = '#fff';
    } else if (type === 'equals') {
      bgColor = colors.success;
      textColor = '#fff';
    } else if (type === 'clear') {
      bgColor = colors.error;
      textColor = '#fff';
    }

    return (
      <TouchableOpacity
        style={[styles.calcBtn, { backgroundColor: bgColor, flex: span }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.calcBtnText, { color: textColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[style, { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType="decimal-pad"
          {...otherProps}
        />
        <TouchableOpacity
          style={[styles.calcIcon, { backgroundColor: colors.accent }]}
          onPress={() => {
            setCalcDisplay(value || '0');
            setShowCalc(true);
          }}
        >
          <Ionicons name="calculator" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showCalc} animationType="slide" transparent onRequestClose={() => setShowCalc(false)}>
        <View style={styles.calcOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCalc(false)} />
          <View style={[styles.calcModal, { backgroundColor: colors.background }]}>
            <View style={styles.calcHandle} />
            <Text style={[styles.calcTitle, { color: colors.text }]}>Calculator</Text>
            
            {/* Display */}
            <View style={[styles.calcDisplay, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.calcDisplayText, { color: colors.text }]}>{calcDisplay}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.calcGrid}>
              <View style={styles.calcRow}>
                <CalcButton label="C" onPress={handleClear} type="clear" />
                <CalcButton label="⌫" onPress={handleDelete} />
                <CalcButton label="÷" onPress={() => handleOperationPress('÷')} type="operation" />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="7" onPress={() => handleNumberPress('7')} />
                <CalcButton label="8" onPress={() => handleNumberPress('8')} />
                <CalcButton label="9" onPress={() => handleNumberPress('9')} />
                <CalcButton label="×" onPress={() => handleOperationPress('×')} type="operation" />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="4" onPress={() => handleNumberPress('4')} />
                <CalcButton label="5" onPress={() => handleNumberPress('5')} />
                <CalcButton label="6" onPress={() => handleNumberPress('6')} />
                <CalcButton label="-" onPress={() => handleOperationPress('-')} type="operation" />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="1" onPress={() => handleNumberPress('1')} />
                <CalcButton label="2" onPress={() => handleNumberPress('2')} />
                <CalcButton label="3" onPress={() => handleNumberPress('3')} />
                <CalcButton label="+" onPress={() => handleOperationPress('+')} type="operation" />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="0" onPress={() => handleNumberPress('0')} span={2} />
                <CalcButton label="." onPress={handleDecimalPress} />
                <CalcButton label="=" onPress={handleEquals} type="equals" />
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={[styles.calcDoneBtn, { backgroundColor: colors.accent }]}
              onPress={handleDone}
            >
              <Text style={styles.calcDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calcIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  calcModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  calcHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  calcTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  calcDisplay: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  calcDisplayText: {
    fontSize: 32,
    fontWeight: '600',
  },
  calcGrid: {
    gap: 12,
  },
  calcRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calcBtn: {
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnText: {
    fontSize: 24,
    fontWeight: '600',
  },
  calcDoneBtn: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  calcDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

