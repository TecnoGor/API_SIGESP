import axios from 'axios'; 

export class TokenManager {
    public currentToken?: string | null;
    public tokenExpiry?:number | null;
    public refreshTimeout?:any | null;

    constructor() {
        this.currentToken = null;
        this.tokenExpiry = null;
        this.refreshTimeout = null;
    }

    async getToken() {
        if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.currentToken;
        }

        return await this.refreshToken();
    }

    async refreshToken() {
        try {
            console.log('🔄 Solicitando nuevo token...');

            const payLoad = {
                userName: process.env.APP_API_CGI_USER,
                userPassword: process.env.APP_API_CGI_PASSWORD
            };
            
            const response = await axios.post(
                `${process.env.APP_API_CGI_URL}/api/Invoice/create_token_authenticator`,
                payLoad,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            if (response.data.success && response.data.token) {
                this.currentToken = response.data.token;
                this.tokenExpiry = Date.now() + (50 * 60 * 1000);

                this.scheduleTokenRefresh();
                
                console.log('✅ Token renovado exitosamente');

                return this.currentToken;
            } else {
                throw new Error('No se pudo obtener el token: ' + response.data.message);
            }

        } catch (error) {
            // console.error('❌ Error renovando token:', error.message);
            
            // if (error.response) {
            //     console.error('Detalles:', error.response.data);
            // }
            
            throw error;
        }
    }

    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        this.refreshTimeout = setTimeout(() => {
            console.log('⏰ Renovando token automáticamente...');

            this.refreshToken().catch(err => {
                console.error('Error en renovación automática:', err);
            });

        }, 45 * 60 * 1000);
    }
    async forceRefresh() {
        return await this.refreshToken();
    }

    getTokenStatus() {
        if (!this.currentToken) {
            return { hasToken: false, status: 'No hay token' };
        }

        const timeUntilExpiry = this.tokenExpiry! - Date.now();
        const minutesLeft = Math.floor(timeUntilExpiry / 60000);

        return {
            hasToken: true,
            token: this.currentToken.substring(0, 20) + '...', // Solo mostrar parte del token
            expiresIn: `${minutesLeft} minutos`,
            isExpired: timeUntilExpiry <= 0
        };
    }
}
