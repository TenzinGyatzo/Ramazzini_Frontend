import { describe, expect, it } from 'vitest';
import { rutaDeRegresoSegura, urlLoginConRegreso } from './rutaDeRegreso';

describe('rutaDeRegresoSegura', () => {
  it('acepta rutas internas con parámetros y ancla', () => {
    expect(rutaDeRegresoSegura('/expediente/e1/c1/t1')).toBe('/expediente/e1/c1/t1');
    expect(rutaDeRegresoSegura('/dashboard?centro=c1#informes')).toBe('/dashboard?centro=c1#informes');
  });

  it('toma el primer valor si la consulta trae varios', () => {
    expect(rutaDeRegresoSegura(['/a', '/b'])).toBe('/a');
  });

  it('rechaza direcciones externas o que el navegador trata como otro sitio', () => {
    expect(rutaDeRegresoSegura('https://otro.com')).toBeNull();
    expect(rutaDeRegresoSegura('//otro.com/ruta')).toBeNull();
    expect(rutaDeRegresoSegura('/\\otro.com')).toBeNull();
    expect(rutaDeRegresoSegura('javascript:alert(1)')).toBeNull();
    expect(rutaDeRegresoSegura('expediente')).toBeNull();
    expect(rutaDeRegresoSegura('/a\nb')).toBeNull();
  });

  it('rechaza el inicio, el login y las pantallas sin sesión', () => {
    expect(rutaDeRegresoSegura('/')).toBeNull();
    expect(rutaDeRegresoSegura('/?x=1')).toBeNull();
    expect(rutaDeRegresoSegura('/login')).toBeNull();
    expect(rutaDeRegresoSegura('/login?redirect=/x')).toBeNull();
    expect(rutaDeRegresoSegura('/auth/olvide-password')).toBeNull();
  });

  it('rechaza valores vacíos, no texto o demasiado largos', () => {
    expect(rutaDeRegresoSegura('')).toBeNull();
    expect(rutaDeRegresoSegura(undefined)).toBeNull();
    expect(rutaDeRegresoSegura(42)).toBeNull();
    expect(rutaDeRegresoSegura(`/${'a'.repeat(2001)}`)).toBeNull();
  });

  it('no confunde rutas que solo empiezan parecido a /login', () => {
    expect(rutaDeRegresoSegura('/loginx')).toBe('/loginx');
  });
});

describe('urlLoginConRegreso', () => {
  it('arma el login con la ruta de regreso codificada', () => {
    expect(urlLoginConRegreso('/expediente/e1?x=1')).toBe('/login?redirect=%2Fexpediente%2Fe1%3Fx%3D1');
  });

  it('agrega el motivo cuando la sesión venció', () => {
    expect(urlLoginConRegreso('/dashboard', { sesionVencida: true })).toBe(
      '/login?redirect=%2Fdashboard&motivo=sesion',
    );
  });

  it('sin ruta válida queda el login solo', () => {
    expect(urlLoginConRegreso('/')).toBe('/login');
    expect(urlLoginConRegreso('/login')).toBe('/login');
  });
});
