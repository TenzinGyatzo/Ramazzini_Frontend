import { generateClasses } from "@formkit/themes";
import { isBirthDateInRegistrationRange } from "./src/helpers/dates";
import {
  PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE,
  PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE,
  validatePersonNameCharactersRule,
} from "./src/helpers/personNameCharacterValidation";

export const FIRMANTE_EDAD_MINIMA = 18;
export const FIRMANTE_EDAD_MAXIMA = 90;
export const TRABAJADOR_EDAD_MINIMA = 18;
export const TRABAJADOR_EDAD_MAXIMA = 100;
export const PERSON_NAME_MIN_LENGTH = 2;
export const PERSON_NAME_MAX_LENGTH = 50;

export const PERSON_NAME_VALIDATION_MESSAGE = `Debe tener entre ${PERSON_NAME_MIN_LENGTH} y ${PERSON_NAME_MAX_LENGTH} caracteres.`;

export { PERSON_NAME_CHARACTERS_VALIDATION_MESSAGE, PERSON_NAME_CHARACTERS_SIN_REGIMEN_VALIDATION_MESSAGE };

const rfcValidation = ({ value }) => {
  // Validación flexible para identificadores de empresa (RFC, Registro Patronal, etc.)
  // Acepta formatos con y sin separadores, alfanuméricos
  // Al menos 3 caracteres al inicio (alfabéticos), seguido de números y letras
  // Ejemplos: RFC12345XYZ, REG-123456, PATRONAL123, ABC-123456-DEF, etc.
  const rfcRegex = /^[A-ZÑÁÉÍÓÚ&]{2,8}[\s\-\._]?[A-Z0-9ÑÁÉÍÓÚ\s\-\._]{4,20}$/;
  return rfcRegex.test(value.trim().toUpperCase());
};
const postalCodeValidation = ({ value }) => {
  // Validación flexible para códigos postales de 4 a 10 dígitos
  const postalCodeRegex = /^[0-9]{4,10}$/;
  return postalCodeRegex.test(value.trim());
};
const phoneValidation = ({ value }) => {
  // Validación flexible para números internacionales (4-15 dígitos)
  const phoneRegex = /^\+?[0-9]\d{3,14}$/;
  return phoneRegex.test(value.trim());
};
const mailValidation = ({ value }) => {
  const mailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return mailRegex.test(value.trim());
};
const urlValidation = ({ value }) => {
  const urlRegex = /^(?![.-])(?!.*[.-]{2})(?=.*\.)[a-zA-Z0-9.-]+(?<![.-])$/;
  return urlRegex.test(value.trim());
};
const cedulaProfesionalValidation = ({ value }) => {
  const registroRegex = /^[A-Za-z0-9\- ]{3,20}$/;
  return registroRegex.test(value.trim());
};
const cedulaEspecialistaValidation = ({ value }) => {
  const registroRegex = /^[A-Za-z0-9\- ]{3,20}$/;
  return registroRegex.test(value.trim());
};
const emailValidation = ({ value }) => {
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return emailRegex.test(value.trim());
};
const passwordValidation = ({ value }) => {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return passwordRegex.test(value.trim());
};

const nssValidation = ({ value }) => {
  // Validación flexible para NSS que acepta formatos de diferentes países
  // Acepta: números, letras, espacios, guiones, puntos, guiones bajos y barras
  // Longitud: 4 a 30 caracteres
  const nssRegex = /^[A-Za-z0-9\s\-_.\/]{4,30}$/;
  return nssRegex.test(value);
};

const curpValidation = ({ value }) => {
  // Validación flexible para identificadores LATAM (DPI, cédula, etc.)
  // Longitud: 4 a 30 caracteres
  const curpRegex = /^[A-Za-z0-9\s\-_.\/]{4,30}$/;
  return curpRegex.test(value);
};

const curpRenapoValidation = ({ value }) => {
  if (!value || String(value).trim() === '') {
    return true;
  }
  const normalized = String(value).trim().toUpperCase();
  const renapoRegex = /^([A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d|XXXX999999XXXXXX99)$/;
  return renapoRegex.test(normalized);
};

const fechaNacimientoFirmanteValidation = ({ value }) => {
  if (!value) return false;
  return isBirthDateInRegistrationRange(
    value,
    new Date(),
    FIRMANTE_EDAD_MINIMA,
    FIRMANTE_EDAD_MAXIMA,
  );
};

const fechaNacimientoTrabajadorValidation = ({ value }) => {
  if (!value) return false;
  return isBirthDateInRegistrationRange(
    value,
    new Date(),
    TRABAJADOR_EDAD_MINIMA,
    TRABAJADOR_EDAD_MAXIMA,
  );
};

const isValidPersonNameLength = (value) => {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  return (
    normalized.length >= PERSON_NAME_MIN_LENGTH &&
    normalized.length <= PERSON_NAME_MAX_LENGTH
  );
};

const personNameValidation = ({ value }) => isValidPersonNameLength(value);

const personNameOptionalValidation = ({ value }) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return true;
  return isValidPersonNameLength(trimmed);
};

const personNameCharactersValidation = ({ value }) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return true;
  return validatePersonNameCharactersRule(trimmed, 'SIRES_NOM024');
};

const personNameOptionalCharactersValidation = ({ value }) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return true;
  return validatePersonNameCharactersRule(trimmed, 'SIRES_NOM024');
};

const personNameCharactersSinRegimenValidation = ({ value }) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return true;
  return validatePersonNameCharactersRule(trimmed, 'SIN_REGIMEN');
};

const personNameOptionalCharactersSinRegimenValidation = ({ value }) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return true;
  return validatePersonNameCharactersRule(trimmed, 'SIN_REGIMEN');
};

const config = {
  config: {
    classes: generateClasses({
      global: {
        wrapper: "space-y-0 mb-0",
        messages: "empty:hidden m-0 p-0",
        message: "text-red-700 text-sm mt-0.5 mb-2 leading-snug",
        label: "block font-medium text-lg text-gray-700",
        input:
         "w-full h-15 p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-0",
      },
      select: {
        input:
          "w-full h-15 p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-0",
      },
      date: {
        input:
          "w-full h-15 p-3 border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-0",
      },
      submit: {
        input:
          "$reset text-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg text-white font-normal w-full p-3 transition-transform transform hover:scale-105 disabled:hover:scale-100 shadow-md m-0",
      },      
      file: {
        input:
          "block w-full p-3 border-2 border-dashed hover:border-emerald-500 rounded-lg cursor-pointer text-gray-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 file:cursor-pointer file:bg-emerald-500 file:text-white file:font-normal file:py-2 file:px-4 file:rounded-full file:border-none hover:file:bg-emerald-600 transition-colors duration-200 ease-in-out",
      },
    }),
    validationRules: {
      rfcValidation,
      postalCodeValidation,
      phoneValidation,
      mailValidation,
      urlValidation,
      emailValidation,
      passwordValidation,
      cedulaProfesionalValidation,
      cedulaEspecialistaValidation,
      nssValidation,
      curpValidation,
      curpRenapoValidation,
      fechaNacimientoFirmanteValidation,
      fechaNacimientoTrabajadorValidation,
      personNameValidation,
      personNameOptionalValidation,
      personNameCharactersValidation,
      personNameOptionalCharactersValidation,
      personNameCharactersSinRegimenValidation,
      personNameOptionalCharactersSinRegimenValidation,
    },
  },
};

export default config;
