# All in seconds
MIN_STEP_DELAY = 60
PLAYER_TIMEOUT = 60
PLAYER_READY_TIMEOUT = 30

REDIS = {
    'host': 'localhost',
    'port': 6379,
    'db': 1
}

SIM = {
    'design_id': 'chicago',
    'pricing_horizon': 5 * 12,
    'tenants': {
        'moving_penalty': 10,
        'min_area': 50
    },
    'base_appreciation': 1.02,

    # Contagion/word-of-mouth model
    'sociality': 0.01, # Probability a tenant sees a friend,

    # Percent of rent paid to DOMA
    # that converts to shares
    'doma_rent_share': 0.1,
    'doma_initial_fund': 1000000
}
