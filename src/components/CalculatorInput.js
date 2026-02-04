import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import i18n from '../utils/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalculatorInput({ value, onChangeText, placeholder, style, ...otherProps }) {
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);

  const isSmallScreen = screenHeight < 600 || screenWidth < 360;
  const calcModalMaxHeight = Math.min(screenHeight * 0.82, 520);
  const calcDisplayFontSize = isSmallScreen ? 24 : 32;
  const calcBtnHeight = isSmallScreen ? 48 : 60;
  const calcBtnFontSize = isSmallScreen ? 20 : 24;

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

  const CalcButton = ({ label, onPress, span = 1, type = 'default', height, fontSize }) => {
    let bgColor = colors.surface;
    let textColor = colors.text;
    
    if (type === 'operation') {
      bgColor = colors.accent;
      textColor = colors.onAccent;
    } else if (type === 'equals') {
      bgColor = colors.success;
      textColor = colors.onSuccess;
    } else if (type === 'clear') {
      bgColor = colors.error;
      textColor = colors.onError;
    }

    return (
      <TouchableOpacity
        style={[styles.calcBtn, { backgroundColor: bgColor, flex: span, minHeight: height, height }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.calcBtnText, { color: textColor, fontSize: fontSize }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
    <View style={styles.inputWrapper}>
      <TextInput
        style={[styles.inputFlex, style]}
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
        <Ionicons name="calculator" size={18} color={colors.onAccent} />
      </TouchableOpacity>
    </View>

      <Modal visible={showCalc} animationType="slide" transparent onRequestClose={() => setShowCalc(false)}>
        <View style={styles.calcOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCalc(false)} />
          <View style={[styles.calcModal, { backgroundColor: colors.background, maxHeight: calcModalMaxHeight, paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
            <View style={[styles.calcHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.calcTitle, { color: colors.text }, isSmallScreen && { fontSize: 18, marginBottom: 12 }]}>{i18n.t('calculator')}</Text>
            
            {/* Display - responsive so value and sign stay visible */}
            <View style={[styles.calcDisplay, { backgroundColor: colors.backgroundSecondary }, isSmallScreen && { padding: 12, minHeight: 48, marginBottom: 12 }]}>
              <Text style={[styles.calcDisplayText, { color: colors.text, fontSize: calcDisplayFontSize }]} numberOfLines={1} adjustsFontSizeToFit={true}>
                {calcDisplay}
              </Text>
            </View>

            {/* Buttons - responsive height */}
            <View style={[styles.calcGrid, isSmallScreen && { gap: 8 }]}>
              <View style={styles.calcRow}>
                <CalcButton label="C" onPress={handleClear} type="clear" height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="⌫" onPress={handleDelete} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="÷" onPress={() => handleOperationPress('÷')} type="operation" height={calcBtnHeight} fontSize={calcBtnFontSize} />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="7" onPress={() => handleNumberPress('7')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="8" onPress={() => handleNumberPress('8')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="9" onPress={() => handleNumberPress('9')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="×" onPress={() => handleOperationPress('×')} type="operation" height={calcBtnHeight} fontSize={calcBtnFontSize} />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="4" onPress={() => handleNumberPress('4')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="5" onPress={() => handleNumberPress('5')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="6" onPress={() => handleNumberPress('6')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="-" onPress={() => handleOperationPress('-')} type="operation" height={calcBtnHeight} fontSize={calcBtnFontSize} />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="1" onPress={() => handleNumberPress('1')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="2" onPress={() => handleNumberPress('2')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="3" onPress={() => handleNumberPress('3')} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="+" onPress={() => handleOperationPress('+')} type="operation" height={calcBtnHeight} fontSize={calcBtnFontSize} />
              </View>
              <View style={styles.calcRow}>
                <CalcButton label="0" onPress={() => handleNumberPress('0')} span={2} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="." onPress={handleDecimalPress} height={calcBtnHeight} fontSize={calcBtnFontSize} />
                <CalcButton label="=" onPress={handleEquals} type="equals" height={calcBtnHeight} fontSize={calcBtnFontSize} />
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={[styles.calcDoneBtn, { backgroundColor: colors.accent }, isSmallScreen && { marginTop: 12, padding: 12 }]}
              onPress={handleDone}
            >
              <Text style={[styles.calcDoneText, { color: colors.onAccent }]}>{i18n.t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnText: {
    fontWeight: '600',
  },
  inputFlex: {
    flex: 1,
    minWidth: 0,
  },
  calcDoneBtn: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  calcDoneText: {
    fontSize: 16,
    fontWeight: '600',
  },
});


