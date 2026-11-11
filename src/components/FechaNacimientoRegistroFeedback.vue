<script setup>
import { computed } from 'vue';
import {
  isBirthDateInRegistrationRange,
  calculateExactAgeDuration,
  formatExactAgeDuration,
  buildRegistrationAgeRangeMessage,
  buildRegistrationAgeRangeText,
} from '@/helpers/dates';
import {
  FIELD_AUXILIARY_MESSAGES_CLASS,
  FIELD_AUXILIARY_MESSAGES_ITEM_CLASS,
} from '@/helpers/fieldAuxiliaryMessages';
import { isFechaNacimientoReadyForCurpCrossCheck } from '@/utils/curp';

const props = defineProps({
  minYears: {
    type: Number,
    required: true,
  },
  maxYears: {
    type: Number,
    required: true,
  },
  fechaNacimiento: {
    type: String,
    default: '',
  },
});

const normalizedFecha = computed(() => String(props.fechaNacimiento ?? '').trim());

const isFechaReady = computed(() =>
  isFechaNacimientoReadyForCurpCrossCheck(normalizedFecha.value || null),
);

const isValid = computed(() => {
  if (!normalizedFecha.value || !isFechaReady.value) {
    return null;
  }
  try {
    return isBirthDateInRegistrationRange(
      normalizedFecha.value,
      new Date(),
      props.minYears,
      props.maxYears,
    );
  } catch {
    return false;
  }
});

const validAgeText = computed(() => {
  if (!normalizedFecha.value || !isFechaReady.value || isValid.value !== true) {
    return '';
  }
  try {
    const duration = calculateExactAgeDuration(normalizedFecha.value);
    return `Edad calculada: ${formatExactAgeDuration(duration)}.`;
  } catch {
    return '';
  }
});

const invalidMessage = computed(() => {
  if (!normalizedFecha.value || !isFechaReady.value || isValid.value !== false) {
    return '';
  }
  try {
    return buildRegistrationAgeRangeMessage(
      props.minYears,
      props.maxYears,
      normalizedFecha.value,
    );
  } catch {
    return buildRegistrationAgeRangeText(props.minYears, props.maxYears);
  }
});

const hasFeedback = computed(() => Boolean(validAgeText.value || invalidMessage.value));
</script>

<template>
  <div
    v-if="hasFeedback"
    :class="FIELD_AUXILIARY_MESSAGES_CLASS"
  >
    <p
      v-if="validAgeText"
      :class="[FIELD_AUXILIARY_MESSAGES_ITEM_CLASS, 'text-emerald-700']"
    >
      {{ validAgeText }}
    </p>
    <p
      v-if="invalidMessage"
      :class="[FIELD_AUXILIARY_MESSAGES_ITEM_CLASS, 'text-red-700']"
    >
      {{ invalidMessage }}
    </p>
  </div>
</template>
